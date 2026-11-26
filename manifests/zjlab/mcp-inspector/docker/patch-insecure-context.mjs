// Injected at image build time into the Inspector web dist.
//
// crypto.randomUUID() only exists in Secure Contexts (HTTPS or localhost).
// This deployment is served over plain HTTP on internal node IPs, so the
// browser UI crashes with "crypto.randomUUID is not a function" on first
// connect. Polyfill it from crypto.getRandomValues(), which IS available in
// insecure contexts. Server-side Node always has randomUUID; this only
// patches the served page. Remove this patch if the UI moves behind TLS.
import { readFileSync, writeFileSync } from "node:fs";

const path =
  "/usr/local/lib/node_modules/@modelcontextprotocol/inspector/clients/web/dist/index.html";

let html = readFileSync(path, "utf8");

const polyfill = `<script>
(function () {
  var c = globalThis.crypto;
  if (c && typeof c.randomUUID !== "function" && typeof c.getRandomValues === "function") {
    c.randomUUID = function () {
      return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, function (t) {
        return (t ^ (c.getRandomValues(new Uint8Array(1))[0] & (15 >> (t / 4)))).toString(16);
      });
    };
  }
})();
</script>`;

if (html.includes("randomUUID")) {
  console.log("randomUUID polyfill already present, skipping");
} else if (html.includes("<head>")) {
  html = html.replace("<head>", "<head>\n    " + polyfill);
  writeFileSync(path, html);
  console.log("randomUUID polyfill injected into index.html");
} else {
  console.error("index.html has no <head> tag; polyfill NOT injected");
  process.exit(1);
}
