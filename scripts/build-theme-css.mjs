// Builds the theme stylesheets from the captured source stylesheet.
//
// src/styles/theme-source.css is the full stylesheet captured from the original
// Vue site and contains components for pages this blog does not ship.
//
// 1. Pruning: a rule is kept when every class, id and Vue scope hash it requires
//    appears somewhere in the site's markup or scripts. Functional pseudo-classes
//    (:not, :is, ...) are ignored when collecting requirements so a missing class
//    there never drops a rule that could still match.
// 2. Splitting: rules whose Vue scope (or classes) occur in only one page's files
//    go to that page's stylesheet (imported by its route), everything else goes
//    to the shared stylesheet imported by globals.css.
//
// Output files are generated before dev and build and are not committed.
import { readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { join, extname, resolve, relative } from "node:path";
import postcss from "postcss";

const root = resolve(import.meta.dirname, "..");
const styles = join(root, "src/styles");
const sourceFile = join(styles, "theme-source.css");
const site = "src/components/sites/yihanglizi-cn-bc4c2f76/";
const contentExtensions = new Set([".html", ".ts", ".tsx", ".json", ".mjs", ".css", ".md"]);

/** Page groups: files only that page uses. Anything else counts as shared. */
const pageGroups = {
  home: [`${site}root-8a5edab2/markup.html`, `${site}root-8a5edab2/starry.html`, `${site}root-8a5edab2/ClientEnhancements.tsx`, `${site}root-8a5edab2/game.ts`, `${site}root-8a5edab2/cosmic-galaxy.ts`, `${site}root-8a5edab2/dipper-states.json`, `${site}root-8a5edab2/zodiac-states.json`],
  friends: [`${site}friends-74954218/`, `${site}shared/friends.ts`],
  tools: [`${site}tools-cc6427ba/`, `${site}shared/tools.ts`, `${site}shared/tools-data.json`],
  about: [`${site}about-4f10f17b/`],
};
const groupOf = file => {
  const rel = relative(root, file).split("\\").join("/");
  return Object.entries(pageGroups).find(([, prefixes]) => prefixes.some(prefix => rel.startsWith(prefix)))?.[0] ?? "shared";
};

/** token -> set of groups whose files mention it */
const tokenGroups = new Map();
const prefixes = [];
function collect(text, group) {
  for (const token of text.match(/[A-Za-z_][\w-]*/g) ?? []) {
    if (!tokenGroups.has(token)) tokenGroups.set(token, new Set());
    tokenGroups.get(token).add(group);
    // Template literals such as `tl-${side}` leave a dangling prefix.
    if (/[-_]$/.test(token) && token.length > 2) prefixes.push(token);
  }
}
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (contentExtensions.has(extname(name)) && !full.startsWith(styles)) collect(readFileSync(full, "utf8"), groupOf(full));
  }
}
walk(join(root, "src"));

const known = name => tokenGroups.has(name) || prefixes.some(prefix => name.startsWith(prefix));

function stripFunctionalPseudos(selector) {
  let out = "";
  for (let i = 0; i < selector.length; i++) {
    const match = /^:(?:not|is|where|has|matches|-webkit-any|-moz-any)\(/.exec(selector.slice(i));
    if (!match) { out += selector[i]; continue; }
    let depth = 0;
    i += match[0].length - 1;
    for (; i < selector.length; i++) {
      if (selector[i] === "(") depth++;
      else if (selector[i] === ")" && --depth === 0) break;
    }
  }
  return out;
}

/** Names a selector requires: classes, ids and Vue scope markers (as data-v-xxxx). */
function requirements(selector) {
  const plain = stripFunctionalPseudos(selector).replace(/\[[^\]]*\]/g, attr => {
    const scope = /data-v-([0-9a-f]{8})/.exec(attr);
    return scope ? ` .data-v-${scope[1]} ` : " ";
  });
  return [...plain.matchAll(/[.#]((?:\\.|[\w-])+)/g)].map(([, name]) => name.replace(/\\(.)/g, "$1"));
}

const selectorCanMatch = selector => requirements(selector).every(name => name.startsWith("data-v-") ? tokenGroups.has(name) : known(name));

/** The single page a selector belongs to, or "shared". */
function selectorGroup(selector) {
  for (const name of requirements(selector)) {
    const groups = tokenGroups.get(name);
    if (groups?.size === 1) {
      const [group] = groups;
      if (group !== "shared") return group;
    }
  }
  return "shared";
}

const css = readFileSync(sourceFile, "utf8");
const ast = postcss.parse(css);
let removedRules = 0;
ast.walkRules(rule => {
  if (rule.parent?.type === "atrule" && /keyframes$/i.test(rule.parent.name)) return;
  const kept = rule.selectors.filter(selectorCanMatch);
  if (!kept.length) { rule.remove(); removedRules++; }
  else if (kept.length !== rule.selectors.length) rule.selectors = kept;
});

// Drop keyframes no remaining declaration or script refers to.
const usedAnimations = new Set();
ast.walkDecls(/^(?:-webkit-)?animation(?:-name)?$/i, decl => {
  for (const word of decl.value.match(/[A-Za-z_][\w-]*/g) ?? []) usedAnimations.add(word);
});
ast.walkAtRules(/keyframes$/i, at => {
  const name = at.params.trim();
  if (!usedAnimations.has(name) && !tokenGroups.has(name)) at.remove();
});

// Split into one root per group, preserving at-rule wrappers and order.
const groups = ["shared", ...Object.keys(pageGroups)];
const outputs = Object.fromEntries(groups.map(group => [group, postcss.root()]));
function nodeGroup(node) {
  if (node.type === "rule") {
    const found = new Set(node.selectors.map(selectorGroup));
    return found.size === 1 ? [...found][0] : "shared";
  }
  if (node.type === "atrule" && /keyframes$/i.test(node.name)) {
    const hash = /([0-9a-f]{8})$/.exec(node.params.trim());
    const groupsForHash = hash && tokenGroups.get(`data-v-${hash[1]}`);
    return groupsForHash?.size === 1 && !groupsForHash.has("shared") ? [...groupsForHash][0] : "shared";
  }
  return "shared";
}
function distribute(container, targets) {
  container.each(node => {
    if (node.type === "atrule" && node.nodes && !/keyframes$/i.test(node.name)) {
      const wrappers = Object.fromEntries(groups.map(group => [group, node.clone({ nodes: [] })]));
      distribute(node, wrappers);
      for (const group of groups) if (wrappers[group].nodes.length) targets[group].append(wrappers[group]);
    } else {
      targets[nodeGroup(node)].append(node.clone());
    }
  });
}
distribute(ast, outputs);

const header = "/* Generated by scripts/build-theme-css.mjs from theme-source.css. Do not edit. */\n";
const sizes = [];
for (const group of groups) {
  const text = outputs[group].toString();
  writeFileSync(join(styles, `theme.${group}.generated.css`), header + text);
  sizes.push(`${group} ${(text.length / 1024).toFixed(0)} KB`);
}
console.log(`theme css: ${(css.length / 1024).toFixed(0)} KB source, removed ${removedRules} rules -> ${sizes.join(", ")}`);
