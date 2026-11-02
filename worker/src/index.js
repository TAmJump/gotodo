// 事業再編TODO の共有データAPI（Cloudflare Worker + D1）
// 個人ごとのパスワード（初回は 5555、ログイン後に本人が変更）とセッションで認証する。
// 記録（メモ）は書いた本人だけが編集・削除できる。すべての保存は履歴（logs）に残す。
const TASK_FIELDS = ["g", "t", "n", "s", "d", "owner", "done", "o"];
const GROUP_FIELDS = ["goal", "status", "memo"];
const LABEL = { g: "事業", t: "タスク名", n: "概要", s: "開始日", d: "期限", owner: "担当", o: "並び順" };
const GLABEL = { goal: "利益化の目標月", status: "状況", memo: "収益源・メモ" };
const STATUS = { none: "未着手", prep: "準備中", revenue: "売上あり", profit: "黒字化" };
const SESSION_HOURS = 12;
const ITER = 10000;

function corsHeaders(req, env) {
  const origin = req.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0] || "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization,Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

const enc = new TextEncoder();
function hex(buf) { return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
function randHex(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return hex(a); }
async function hashPass(pass, salt) {
  const key = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: ITER }, key, 256);
  return hex(bits);
}
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function pick(body, fields) {
  const out = {};
  for (const f of fields) {
    if (!(f in body)) continue;
    let v = body[f];
    if (f === "done") v = v ? 1 : 0;
    else if (f === "o") v = Number(v) || 0;
    else v = String(v ?? "").slice(0, 4000);
    out[f] = v;
  }
  return out;
}
function nowIso() { return new Date().toISOString(); }
function newId(p) { return p + Date.now().toString(36) + randHex(3); }

async function addLog(env, taskId, actor, action, detail) {
  await env.DB.prepare("INSERT INTO logs (id, task_id, actor, action, detail, at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(newId("l"), taskId || "", actor, action, String(detail || "").slice(0, 4000), nowIso()).run();
}
function short(v) { const s = String(v ?? ""); return s.length > 60 ? s.slice(0, 60) + "…" : s; }
function diffTask(before, after) {
  const out = [];
  for (const k of Object.keys(after)) {
    const a = before[k], b = after[k];
    if (String(a ?? "") === String(b ?? "")) continue;
    if (k === "done") out.push(b ? "完了にした" : "未完了に戻した");
    else if (k === "o") continue;
    else out.push(`${LABEL[k] || k}：${short(a) || "（なし）"} → ${short(b) || "（なし）"}`);
  }
  return out;
}

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req, env);
    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });

    const url = new URL(req.url);
    const parts = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    if (parts[0] !== "api") return json({ error: "not_found" }, 404);
    const initial = env.INITIAL_PASS || "5555";

    try {
      // ログイン
      if (req.method === "POST" && parts[1] === "login") {
        const { name, pass } = await req.json();
        const u = await env.DB.prepare("SELECT * FROM users WHERE name = ?").bind(String(name || "")).first();
        if (!u) return json({ error: "unauthorized" }, 401);
        let ok = false;
        if (u.must_change && !u.pass_hash) ok = safeEqual(String(pass || ""), initial);
        else if (u.pass_hash) ok = safeEqual(await hashPass(String(pass || ""), u.salt), u.pass_hash);
        if (!ok) return json({ error: "unauthorized" }, 401);
        const token = randHex(24);
        const exp = new Date(Date.now() + SESSION_HOURS * 3600 * 1000).toISOString();
        await env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(nowIso()).run();
        await env.DB.prepare("INSERT INTO sessions (token, name, expires_at) VALUES (?, ?, ?)").bind(token, u.name, exp).run();
        return json({ token, name: u.name, mustChange: !!u.must_change });
      }

      // ここから先はセッション必須
      const auth = req.headers.get("Authorization") || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      const sess = token
        ? await env.DB.prepare("SELECT s.name, u.must_change FROM sessions s JOIN users u ON u.name = s.name WHERE s.token = ? AND s.expires_at > ?")
            .bind(token, nowIso()).first()
        : null;
      if (!sess) return json({ error: "unauthorized" }, 401);
      const me = sess.name;

      if (req.method === "POST" && parts[1] === "logout") {
        await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
        return json({ ok: true });
      }

      // パスワード変更（初回は必須）
      if (req.method === "POST" && parts[1] === "password") {
        const { pass } = await req.json();
        const p = String(pass || "");
        if (!p.trim()) return json({ error: "empty" }, 400);
        if (p === initial) return json({ error: "same_as_initial" }, 400);
        const salt = randHex(16);
        const h = await hashPass(p, salt);
        await env.DB.prepare("UPDATE users SET pass_hash = ?, salt = ?, must_change = 0 WHERE name = ?").bind(h, salt, me).run();
        await addLog(env, "", me, "password", "パスワードを変更");
        return json({ ok: true });
      }
      if (sess.must_change) return json({ error: "must_change" }, 403);

      if (req.method === "GET" && parts[1] === "data") {
        const g = await env.DB.prepare("SELECT * FROM groups ORDER BY o").all();
        const t = await env.DB.prepare("SELECT * FROM tasks ORDER BY d, o").all();
        const n = await env.DB.prepare("SELECT * FROM notes ORDER BY at").all();
        return json({ me, groups: g.results, tasks: t.results, notes: n.results });
      }

      if (req.method === "GET" && parts[1] === "logs") {
        const task = url.searchParams.get("task");
        const r = task
          ? await env.DB.prepare("SELECT * FROM logs WHERE task_id = ? ORDER BY at DESC LIMIT 200").bind(task).all()
          : await env.DB.prepare("SELECT * FROM logs ORDER BY at DESC LIMIT 300").all();
        return json({ logs: r.results });
      }

      // タスク
      if (parts[1] === "tasks") {
        const id = parts[2];
        if (req.method === "POST" && !id) {
          const body = pick(await req.json(), TASK_FIELDS);
          if (!body.g || !body.t) return json({ error: "invalid" }, 400);
          const tid = newId("t");
          const row = { id: tid, ...body, by: me, at: nowIso() };
          const cols = Object.keys(row);
          await env.DB.prepare(`INSERT INTO tasks (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`).bind(...Object.values(row)).run();
          await addLog(env, tid, me, "create", `タスクを追加：${short(body.t)}`);
          return json({ id: tid }, 201);
        }
        if (id) {
          const before = await env.DB.prepare("SELECT * FROM tasks WHERE id = ?").bind(id).first();
          if (!before) return json({ error: "not_found" }, 404);
          if (req.method === "PUT") {
            const body = pick(await req.json(), TASK_FIELDS);
            const changes = diffTask(before, body);
            if (!changes.length) return json({ ok: true, unchanged: true });
            const row = { ...body, by: me, at: nowIso() };
            const keys = Object.keys(row);
            await env.DB.prepare(`UPDATE tasks SET ${keys.map((k) => k + " = ?").join(", ")} WHERE id = ?`).bind(...Object.values(row), id).run();
            await addLog(env, id, me, "update", changes.join("／"));
            return json({ ok: true });
          }
          if (req.method === "DELETE") {
            await env.DB.prepare("DELETE FROM tasks WHERE id = ?").bind(id).run();
            await env.DB.prepare("DELETE FROM notes WHERE task_id = ?").bind(id).run();
            await addLog(env, id, me, "delete", `タスクを削除：${short(before.t)}`);
            return json({ ok: true });
          }
        }
      }

      // 記録（本人のみ編集・削除）
      if (parts[1] === "notes") {
        const id = parts[2];
        if (req.method === "POST" && !id) {
          const { task_id, body } = await req.json();
          const b = String(body || "").trim().slice(0, 4000);
          if (!task_id || !b) return json({ error: "invalid" }, 400);
          const t = await env.DB.prepare("SELECT id FROM tasks WHERE id = ?").bind(task_id).first();
          if (!t) return json({ error: "not_found" }, 404);
          const nid = newId("n"), at = nowIso();
          await env.DB.prepare("INSERT INTO notes (id, task_id, author, body, at, updated_at) VALUES (?, ?, ?, ?, ?, '')").bind(nid, task_id, me, b, at).run();
          await addLog(env, task_id, me, "note_add", `記録を追加：${short(b)}`);
          return json({ id: nid }, 201);
        }
        if (id) {
          const n = await env.DB.prepare("SELECT * FROM notes WHERE id = ?").bind(id).first();
          if (!n) return json({ error: "not_found" }, 404);
          if (n.author !== me) return json({ error: "forbidden" }, 403);
          if (req.method === "PUT") {
            const { body } = await req.json();
            const b = String(body || "").trim().slice(0, 4000);
            if (!b) return json({ error: "invalid" }, 400);
            if (b === n.body) return json({ ok: true, unchanged: true });
            await env.DB.prepare("UPDATE notes SET body = ?, updated_at = ? WHERE id = ?").bind(b, nowIso(), id).run();
            await addLog(env, n.task_id, me, "note_edit", `記録を編集：${short(n.body)} → ${short(b)}`);
            return json({ ok: true });
          }
          if (req.method === "DELETE") {
            await env.DB.prepare("DELETE FROM notes WHERE id = ?").bind(id).run();
            await addLog(env, n.task_id, me, "note_delete", `記録を削除：${short(n.body)}`);
            return json({ ok: true });
          }
        }
      }

      // 事業（利益化の目標・状況・メモ）
      if (parts[1] === "groups" && parts[2] && req.method === "PUT") {
        const before = await env.DB.prepare("SELECT * FROM groups WHERE id = ?").bind(parts[2]).first();
        if (!before) return json({ error: "not_found" }, 404);
        const body = pick(await req.json(), GROUP_FIELDS);
        const keys = Object.keys(body).filter((k) => String(before[k] ?? "") !== String(body[k] ?? ""));
        if (!keys.length) return json({ ok: true, unchanged: true });
        await env.DB.prepare(`UPDATE groups SET ${keys.map((k) => k + " = ?").join(", ")} WHERE id = ?`).bind(...keys.map((k) => body[k]), parts[2]).run();
        const fmt = (k, v) => (k === "status" ? STATUS[v] || v : short(v));
        await addLog(env, "g:" + parts[2], me, "group", `${before.name}／` + keys.map((k) => `${GLABEL[k]}：${fmt(k, before[k]) || "（なし）"} → ${fmt(k, body[k]) || "（なし）"}`).join("／"));
        return json({ ok: true });
      }

      return json({ error: "not_found" }, 404);
    } catch (e) {
      return json({ error: "server_error" }, 500);
    }
  },
};
