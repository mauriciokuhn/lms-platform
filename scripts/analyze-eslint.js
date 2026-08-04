const fs = require("fs");
const logPath = process.argv[2] || "/tmp/eslint.log";
const lines = fs.readFileSync(logPath, "utf8").split(/\r?\n/);
let cur = "";
const byFile = {};
const byRule = {};
for (const l of lines) {
  if (/^[A-Z]:/.test(l)) {
    cur = l.trim();
    if (!byFile[cur]) byFile[cur] = { err: 0, warn: 0 };
  } else {
    const m = l.match(/\b(error|warning)\b/);
    if (m && cur) {
      byFile[cur][m[1]]++;
      if (m[1] === "error") {
        const r = l.match(/(@typescript-eslint\/[a-z-]+|react-hooks\/[a-z-]+|import\/[a-z-]+|@next\/[a-z-]+)/);
        if (r) byRule[r[1]] = (byRule[r[1]] || 0) + 1;
      }
    }
  }
}
console.log("=== ERRORS BY FILE (top 15) ===");
Object.entries(byFile)
  .filter(([, v]) => v.err > 0)
  .sort((a, b) => b[1].err - a[1].err)
  .slice(0, 15)
  .forEach(([f, v]) => {
    const short = f.split("thmrmkr3hi6nhg")[1] || f;
    console.log(`${String(v.err).padStart(4)} errors / ${String(v.warn).padStart(4)} warns  ${short}`);
  });
console.log("=== TOP ERROR RULES ===");
Object.entries(byRule)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([r, c]) => console.log(String(c).padStart(4) + "  " + r));
console.log("=== TOTAL ===");
let errs = 0, warns = 0;
for (const v of Object.values(byFile)) { errs += v.err; warns += v.warn; }
console.log(`errors: ${errs}, warnings: ${warns}`);
