// 事業再編TODO の共有データAPI（Cloudflare Worker + D1）
// 認証はグループ共通のパスコード（wrangler secret put PASSCODE で設定）
const TASK_FIELDS = ["g", "t", "n", "s", "d", "owner", "done", "o", "by", "at"];
const GROUP_FIELDS = ["name", "tag", "note", "o", "goal", "status", "memo"];

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
    else v = String(v ?? "").slice(0, 2000);
    out[f] = v;
  }
  return out;
}

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req, env);
    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });

    const auth = req.headers.get("Authorization") || "";
    if (!env.PASSCODE || !safeEqual(auth, "Bearer " + env.PASSCODE)) return json({ error: "unauthorized" }, 401);

    const url = new URL(req.url);
    const parts = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean); // ["api","tasks",":id"]
    if (parts[0] !== "api") return json({ error: "not_found" }, 404);

    try {
      if (req.method === "GET" && parts[1] === "data") {
        const g = await env.DB.prepare("SELECT * FROM groups ORDER BY o").all();
        const t = await env.DB.prepare("SELECT * FROM tasks ORDER BY d, o").all();
        return json({ groups: g.results, tasks: t.results });
      }

      if (parts[1] === "tasks") {
        const id = parts[2];
        if (req.method === "POST" && !id) {
          const body = pick(await req.json(), TASK_FIELDS);
          if (!body.g || !body.t) return json({ error: "invalid" }, 400);
          const newId = "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
          const cols = ["id", ...Object.keys(body)];
          await env.DB.prepare(`INSERT INTO tasks (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`)
            .bind(newId, ...Object.values(body)).run();
          return json({ id: newId }, 201);
        }
        if (req.method === "PUT" && id) {
          const body = pick(await req.json(), TASK_FIELDS);
          const keys = Object.keys(body);
          if (!keys.length) return json({ error: "invalid" }, 400);
          await env.DB.prepare(`UPDATE tasks SET ${keys.map((k) => k + " = ?").join(", ")} WHERE id = ?`)
            .bind(...Object.values(body), id).run();
          return json({ ok: true });
        }
        if (req.method === "DELETE" && id) {
          await env.DB.prepare("DELETE FROM tasks WHERE id = ?").bind(id).run();
          return json({ ok: true });
        }
      }

      if (parts[1] === "groups" && parts[2] && req.method === "PUT") {
        const body = pick(await req.json(), GROUP_FIELDS);
        const keys = Object.keys(body);
        if (!keys.length) return json({ error: "invalid" }, 400);
        await env.DB.prepare(`UPDATE groups SET ${keys.map((k) => k + " = ?").join(", ")} WHERE id = ?`)
          .bind(...Object.values(body), parts[2]).run();
        return json({ ok: true });
      }

      return json({ error: "not_found" }, 404);
    } catch (e) {
      return json({ error: "server_error" }, 500);
    }
  },
};
