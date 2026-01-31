#!/usr/bin/env node
/**
 * Rename all acmekit/acmekitjs references to acmekit across the project:
 * - Files and folders containing "acmekit" in name
 * - All file content (imports, types, strings, config paths)
 * - package.json deps (using npm: aliases so @acmekit/* resolves to @acmekit/*)
 * - Adds acmekit bin pointing to CLI
 *
 * Run from repo root: node scripts/rename-acmekit-to-acmekit.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".yarn",
  ".cache",
  "coverage",
  "dist",
  "build",
]);
const SKIP_FILES = new Set(["yarn.lock", "pnpm-lock.yaml", "package-lock.json"]);
const TEXT_EXT = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "json",
  "yml",
  "yaml",
  "md",
  "sh",
  "env",
  "env.template",
  "env.test",
  "gitignore",
  "npmrc",
  "tsbuildinfo",
]);

// Replacements: [pattern, replacement]; order matters (longer/specific first)
const CONTENT_REPLACEMENTS = [
  ["@acmekit/acmekit", "@acmekit/acmekit"],
  ["@acmekit/framework", "@acmekit/framework"],
  ["@acmekit/test-utils", "@acmekit/test-utils"],
  ["@acmekit/admin-sdk", "@acmekit/admin-sdk"],
  ["@acmekit/cli", "@acmekit/cli"],
  ["@acmekit/utils", "@acmekit/utils"],
  ["@acmekit/ui", "@acmekit/ui"],
  ["@acmekit/icons", "@acmekit/icons"],
  ["@acmekit/", "@acmekit/"],
  ["AcmekitNextFunction", "AcmekitNextFunction"],
  ["AcmekitRequest", "AcmekitRequest"],
  ["AcmekitResponse", "AcmekitResponse"],
  ["AcmekitContainer", "AcmekitContainer"],
  ["AcmekitService", "AcmekitService"],
  ["AcmekitIntegrationTestRunner", "acmekitIntegrationTestRunner"],
  [".acmekit/types", ".acmekit/types"],
  [".acmekit/server", ".acmekit/server"],
  [".acmekit/admin", ".acmekit/admin"],
  [".acmekit/", ".acmekit/"],
  [".acmekit", ".acmekit"],
  ["acmekit-config.ts", "acmekit-config.ts"],
  ["acmekit-config.js", "acmekit-config.js"],
  ["acmekit-config", "acmekit-config"],
  ["acmekit-db.sql", "acmekit-db.sql"],
  ["acmekit-db", "acmekit-db"],
  ["acmekit-v2", "acmekit-v2"],
  ["acmekit build", "acmekit build"],
  ["acmekit start", "acmekit start"],
  ["acmekit develop", "acmekit develop"],
  ["acmekit exec", "acmekit exec"],
  ["acmekit db:migrate", "acmekit db:migrate"],
  ["acmekit db:generate", "acmekit db:generate"],
  ["npx acmekit", "npx acmekit"],
  ["./node_modules/.bin/acmekit", "./node_modules/.bin/acmekit"],
  ["my-acmekit-project", "my-acmekit-project"],
  ["Acmekit (https://acmekit.com)", "Acmekit (https://acmekit.com)"],
  ["Acmekit logo", "Acmekit logo"],
  ["Acmekit application", "Acmekit application"],
  ["Acmekit application.", "Acmekit application."],
  ["Acmekit's CLI", "Acmekit's CLI"],
  ["Acmekit Container", "Acmekit Container"],
  ["Acmekit Container.", "Acmekit Container."],
  ["Acmekit Admin", "Acmekit Admin"],
  ["Acmekit T-Shirt", "Acmekit T-Shirt"],
  ["Acmekit Sweatshirt", "Acmekit Sweatshirt"],
  ["Acmekit Sweatpants", "Acmekit Sweatpants"],
  ["Acmekit Shorts", "Acmekit Shorts"],
  ["Acmekit's architecture", "Acmekit's architecture"],
  ["Acmekit's", "Acmekit's"],
  ["Acmekit Blog", "Acmekit Blog"],
  ["What is Acmekit", "What is Acmekit"],
  ["Acmekit is a set", "Acmekit is a set"],
  ["acmekit.com", "acmekit.com"],
  ["docs.acmekitjs.com", "docs.acmekit.com"],
  ["www.acmekitjs.com", "www.acmekit.com"],
  ["acmekit-starter-default", "acmekit-starter-default"],
  ["acmekit-starter", "acmekit-starter"],
  ["For Acmekit projects", "for Acmekit projects"],
  ["Acmekit projects", "Acmekit projects"],
  ["Acmekit tooling", "Acmekit tooling"],
  ["Acmekit's Configurations", "Acmekit's Configurations"],
  ["Acmekit's Configurations.", "Acmekit's Configurations."],
  ["Acmekit module", "Acmekit module"],
  ["Acmekit modules", "Acmekit modules"],
  ["Related to Acmekit", "related to Acmekit"],
  ["acmekit-dev", "acmekit-dev"],
  ["acmekit-test-utils", "acmekit-test-utils"],
  ["acmekit*", "acmekit*"],
  ["@acmekit*", "@acmekit*"],
  ["acmekit", "acmekit"], // catch-all lowercase last
];

function isTextFile(name) {
  const ext = path.extname(name).slice(1).toLowerCase();
  if (TEXT_EXT.has(ext)) return true;
  if (name.startsWith(".") && !ext) {
    const base = path.basename(name);
    if (TEXT_EXT.has(base)) return true;
  }
  return false;
}

function shouldRenamePath(relativePath) {
  const lower = relativePath.toLowerCase();
  return (
    lower.includes("acmekit") &&
    !lower.includes("node_modules") &&
    !lower.includes(".git/")
  );
}

function newPathForRename(relativePath) {
  return relativePath
    .replace(/acmekit-config\./gi, "acmekit-config.")
    .replace(/acmekit-db\./gi, "acmekit-db.")
    .replace(/acmekit/gi, "acmekit");
}

function replaceInContent(content) {
  let out = content;
  for (let i = 0; i < CONTENT_REPLACEMENTS.length; i++) {
    const [from, to] = CONTENT_REPLACEMENTS[i];
    const re = new RegExp(escapeRe(from), "gi");
    const isCatchAll = from === "acmekit" && to === "acmekit";
    out = out.replace(re, (match) => {
      if (isCatchAll) {
        if (match === match.toUpperCase()) return "ACMEKIT";
        if (match[0] === match[0].toUpperCase()) return "Acmekit";
        return "acmekit";
      }
      return match === match.toLowerCase() ? to : (to.charAt(0).toUpperCase() + to.slice(1));
    });
  }
  return out;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getAllFiles(dir, base = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const rel = path.join(base, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      files.push(...getAllFiles(path.join(dir, e.name), rel));
    } else {
      if (SKIP_FILES.has(e.name)) continue;
      files.push(rel);
    }
  }
  return files;
}

function applyContentReplacements(filePath) {
  const full = path.join(ROOT, filePath);
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return;
  if (!isTextFile(filePath)) return;
  let content;
  try {
    content = fs.readFileSync(full, "utf8");
  } catch {
    return;
  }
  const updated = replaceInContent(content);
  if (updated !== content) {
    fs.writeFileSync(full, updated, "utf8");
    console.log("  content: " + filePath);
  }
}

function updatePackageJson() {
  const pkgPath = path.join(ROOT, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

  pkg.name = "acmekit-starter-default";
  pkg.description = (pkg.description || "").replace(/Acmekit/g, "Acmekit");
  pkg.author = (pkg.author || "").replace(/Acmekit/g, "Acmekit").replace(/acmekitjs\.com/g, "acmekit.com");
  if (Array.isArray(pkg.keywords)) {
    pkg.keywords = pkg.keywords.map((k) => (k === "acmekit" ? "acmekit" : k));
  }

  // Map @acmekit/* to npm:@medusajs/* so installs resolve to real packages
  const depAlias = (acmekitKey, version) => {
    const v = (version || "").replace(/^npm:[^@]+@/, "").replace(/^[\^~]/, "") || "2.13.1";
    const pkgName = acmekitKey.replace("@acmekit/", "@medusajs/");
    return `npm:${pkgName}@${v}`;
  };

  if (pkg.dependencies) {
    const next = {};
    for (const [key, value] of Object.entries(pkg.dependencies)) {
      if (key.startsWith("@acmekit/")) {
        next[key] = value.startsWith("npm:") ? value : depAlias(key, value);
      } else {
        next[key] = value;
      }
    }
    pkg.dependencies = next;
  }
  if (pkg.devDependencies) {
    const next = {};
    for (const [key, value] of Object.entries(pkg.devDependencies)) {
      if (key.startsWith("@acmekit/")) {
        next[key] = value.startsWith("npm:") ? value : depAlias(key, value);
      } else {
        next[key] = value;
      }
    }
    pkg.devDependencies = next;
  }

  // Scripts: acmekit -> acmekit
  if (pkg.scripts) {
    for (const k of Object.keys(pkg.scripts)) {
      pkg.scripts[k] = pkg.scripts[k]
        .replace(/\bacmekit\s+/g, "acmekit ")
        .replace(/\bacmekit\b/g, "acmekit");
    }
  }

  // Expose acmekit binary so "acmekit build" etc. work (CLI is still @acmekit/cli under the hood)
  pkg.bin = pkg.bin || {};
  pkg.bin.acmekit = "node_modules/@acmekit/cli/dist/cli.js";

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
  console.log("  updated package.json (name, deps as @acmekit/* aliases, scripts, bin.acmekit)");
}

function main() {
  console.log("Renaming acmekit -> acmekit...\n");

  // 1. Rename files that contain "acmekit" in their path (do files first, then dirs)
  const allRel = getAllFiles(ROOT);
  const toRename = allRel.filter(shouldRenamePath);
  const renamed = new Set();

  for (const rel of toRename) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) continue;
    const newRel = newPathForRename(rel);
    if (newRel === rel) continue;
    const newFull = path.join(ROOT, newRel);
    try {
      fs.mkdirSync(path.dirname(newFull), { recursive: true });
      fs.renameSync(full, newFull);
      renamed.add(rel);
      console.log("  rename: " + rel + " -> " + newRel);
    } catch (err) {
      console.warn("  skip rename " + rel + ": " + err.message);
    }
  }

  // 2. Content replacements in all text files (including previously renamed)
  const allFilesNow = getAllFiles(ROOT);
  for (const rel of allFilesNow) {
    if (SKIP_FILES.has(path.basename(rel))) continue;
    applyContentReplacements(rel);
  }

  // 3. Special: package.json (deps as aliases, bin, name, scripts)
  updatePackageJson();

  // 4. Shim: framework/CLI often look for acmekit-config; create thin shim so they still find it
  const acmekitConfigPath = path.join(ROOT, "acmekit-config.ts");
  const shimPath = path.join(ROOT, "acmekit-config.ts");
  if (fs.existsSync(acmekitConfigPath) && !fs.existsSync(shimPath)) {
    const shim = `// Shim so tools that expect "acmekit-config" still work
module.exports = require("./acmekit-config");
`;
    fs.writeFileSync(path.join(ROOT, "acmekit-config.js"), shim, "utf8");
    console.log("  created acmekit-config.js shim -> acmekit-config");
  }

  console.log("\nDone. Next: run 'yarn install' to refresh lockfile and install @acmekit/* aliases.");
}

main();
