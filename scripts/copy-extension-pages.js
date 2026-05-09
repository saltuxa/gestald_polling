import fs from "node:fs";
import path from "node:path";

const clientDir = path.resolve("dist/client");
const source = path.join(clientDir, "index.html");

const html = fs
  .readFileSync(source, "utf8")
  .replace(/\s*<script type="module" crossorigin src="[^"]+"><\/script>/, "");

fs.writeFileSync(source, html);

for (const fileName of ["panel.html", "mobile.html", "config.html", "dashboard.html"]) {
  fs.copyFileSync(source, path.join(clientDir, fileName));
}
