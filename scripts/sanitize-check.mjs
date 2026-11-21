import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const scannerPath = path.join(root, "scripts", "sanitize-check.mjs");
const ignoredDirectories = new Set([".git", ".test-dist", "node_modules", "dist"]);
const ignoredFiles = new Set(["package-lock.json", "pnpm-lock.yaml", "yarn.lock"]);
const allowedExtensions = new Set([
  ".css",
  ".example",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".plist",
  ".sql",
  ".svg",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);

const checks = [
  {
    type: "operational URL",
    pattern: /https?:\/\//giu,
  },
  {
    type: "private or government host",
    pattern: /(?:dsat|mlm)\s*\.\s*com?\s*\.\s*mo|\.gov\s*\.\s*mo/giu,
  },
  {
    type: "IPv4 address",
    pattern: /(?<![\w.])(?:\d{1,3}\.){3}\d{1,3}(?![\w.])/gu,
  },
  {
    type: "suspected cloud token",
    pattern: /(?:AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9_-]{16,})/gu,
  },
  {
    type: "suspected JWT",
    pattern: /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{10,}/gu,
  },
  {
    type: "non-empty secret assignment",
    pattern: /^[ \t]*(?:MAPBOX_ACCESS_TOKEN|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_ANON_KEY|VITE_MAPBOX_ACCESS_TOKEN|VITE_SUPABASE_ANON_KEY)[ \t]*=[ \t]*\S+/gmu,
  },
  {
    type: "anti-bot or credential header logic",
    pattern: /(?:user-agent\s*[:=]|set-cookie|authorization\s*:\s*bearer)/giu,
  },
];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    if (entry.isSymbolicLink()) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolute)));
      continue;
    }
    if (ignoredFiles.has(entry.name)) continue;
    if (!allowedExtensions.has(path.extname(entry.name))) continue;
    files.push(absolute);
  }

  return files;
}

const files = await collectFiles(root);
const findings = [];

for (const file of files) {
  if (file === scannerPath) continue;
  const relative = path.relative(root, file);
  const content = await readFile(file, "utf8");
  const scannedContent = content.replace(
    /http:\/\/www\.w3\.org\/(?:2000\/svg|1999\/xlink)/gu,
    "",
  );

  for (const check of checks) {
    check.pattern.lastIndex = 0;
    if (check.pattern.test(scannedContent)) {
      findings.push(`${relative}: ${check.type}`);
    }
  }
}

if (findings.length > 0) {
  console.error("Sanitization check failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log(`Sanitization check passed for ${files.length} files.`);
}
