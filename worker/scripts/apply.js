// 届いた「gotodo-〜.sql」を探して、TODOのデータベースに反映する
// 使い方：npm run update
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const os = require("os");

const home = os.homedir();
const dirs = [
  path.join(home, "Downloads"),
  path.join(home, "OneDrive", "デスクトップ", "後藤グループ"),
  path.join(home, "OneDrive", "Desktop", "後藤グループ"),
  path.join(home, "Desktop", "後藤グループ"),
  path.join(home, "OneDrive", "デスクトップ"),
  path.join(home, "Desktop"),
  process.cwd(),
];
let files = [];
for (const d of dirs) {
  try {
    for (const f of fs.readdirSync(d)) {
      if (/^gotodo-.*\.sql$/i.test(f)) {
        const p = path.join(d, f);
        files.push({ p, t: fs.statSync(p).mtimeMs });
      }
    }
  } catch (e) {}
}
if (!files.length) {
  console.log("\n反映するファイル（gotodo-〜.sql）が見つかりません。");
  console.log("ダウンロード または デスクトップの「後藤グループ」フォルダに保存してから、もう一度実行してください。\n");
  process.exit(1);
}
files.sort((a, b) => a.t - b.t);
for (const f of files) {
  console.log("\n反映します：" + f.p + "\n");
  const r = spawnSync("npx", ["wrangler", "d1", "execute", "gotodo-db", "--remote", "--yes", "--file=" + f.p], { stdio: "inherit", shell: true });
  if (r.status !== 0) {
    console.log("\n反映できませんでした。「Authentication error」が出た場合は npx wrangler login のあと、もう一度 npm run update を実行してください。\n");
    process.exit(1);
  }
  const done = f.p.replace(/\.sql$/i, ".反映済み.txt");
  try { fs.renameSync(f.p, done); } catch (e) {}
  console.log("\n反映しました。ファイル名を「" + path.basename(done) + "」に変えました（二重に反映しないため）。\n");
}
