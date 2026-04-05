const fs = require("fs");
const path = require("path");
const { minify } = require("html-minifier-terser");
const JavaScriptObfuscator = require("javascript-obfuscator");

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");

const COPY_ITEMS = [
  "Admin",
  "assets",
  "img",
  "payment",
  "products",
  "SuperAdmin",
  "Tables",
  "404.html",
  "index.html",
  "config.json",
  "CNAME",
  "netlify.toml"
];

function rmDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    ensureDir(dest);
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }

  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function walk(dir, matcher, acc = []) {
  if (!fs.existsSync(dir)) return acc;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full, matcher, acc);
    } else if (matcher(full)) {
      acc.push(full);
    }
  }
  return acc;
}

async function minifyHtmlFiles() {
  const htmlFiles = walk(DIST, (f) => f.toLowerCase().endsWith(".html"));

  for (const file of htmlFiles) {
    const original = fs.readFileSync(file, "utf8");

    const minified = await minify(original, {
      collapseWhitespace: true,
      removeComments: true,
      minifyCSS: true,
      minifyJS: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeTagWhitespace: true,
      useShortDoctype: true
    });

    fs.writeFileSync(file, minified, "utf8");
  }
}

function obfuscateJsFiles() {
  const jsFiles = walk(DIST, (f) => f.toLowerCase().endsWith(".js"));

  for (const file of jsFiles) {
    const original = fs.readFileSync(file, "utf8");

    const obfuscated = JavaScriptObfuscator.obfuscate(original, {
      compact: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 1,
      stringArray: true,
      stringArrayEncoding: ["base64"],
      stringArrayThreshold: 1,
      selfDefending: true,
      disableConsoleOutput: true
    });

    fs.writeFileSync(file, obfuscated.getObfuscatedCode(), "utf8");
  }
}

async function main() {
  rmDir(DIST);
  ensureDir(DIST);

  for (const item of COPY_ITEMS) {
    const src = path.join(ROOT, item);
    if (fs.existsSync(src)) {
      copyRecursive(src, path.join(DIST, item));
    }
  }

  await minifyHtmlFiles();
  obfuscateJsFiles();

  console.log("Build listo en dist/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});