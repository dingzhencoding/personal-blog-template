// Tiny YAML-frontmatter reader/writer for the browser editor. It understands
// the subset the content model uses (scalars, booleans, inline/block lists)
// and keeps every unmanaged key verbatim so hand-written fields survive saves.

export interface FrontmatterBlock { key: string; raw: string }
export interface ParsedDocument { blocks: FrontmatterBlock[]; body: string }
export type FieldValue = string | boolean | string[] | null;

export function splitDocument(raw: string): ParsedDocument {
  const text = raw.replace(/^/, "");
  const start = /^---[ \t]*\r?\n/.exec(text);
  if (!start) return { blocks: [], body: text };
  const rest = text.slice(start[0].length);
  const end = /(?:^|\r?\n)---[ \t]*(?:\r?\n|$)/.exec(rest);
  if (!end) return { blocks: [], body: text };
  const frontmatter = rest.slice(0, end.index);
  const body = rest.slice(end.index + end[0].length);
  const blocks: FrontmatterBlock[] = [];
  let pending: string[] = [];
  let current: { key: string; lines: string[] } | null = null;
  const flush = () => {
    if (current) blocks.push({ key: current.key, raw: current.lines.join("\n") });
    current = null;
  };
  for (const line of frontmatter.split(/\r?\n/)) {
    const key = /^([A-Za-z_][\w-]*):/.exec(line);
    if (key) {
      flush();
      current = { key: key[1], lines: [...pending, line] };
      pending = [];
    } else if (current) {
      current.lines.push(line);
    } else {
      pending.push(line);
    }
  }
  flush();
  if (pending.length && blocks.length) blocks[blocks.length - 1].raw += `\n${pending.join("\n")}`;
  return { blocks, body };
}

function unquote(raw: string): string {
  const value = raw.trim();
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    try { return JSON.parse(value) as string; } catch { return value.slice(1, -1); }
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  return value.replace(/\s+#.*$/, "").trim();
}

function splitInlineList(inner: string): string[] {
  const items: string[] = [];
  let quote = "";
  let start = 0;
  for (let i = 0; i < inner.length; i++) {
    const char = inner[i];
    if (quote) {
      if (char === quote) quote = "";
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === ",") {
      items.push(inner.slice(start, i));
      start = i + 1;
    }
  }
  items.push(inner.slice(start));
  return items.map((item) => item.trim()).filter(Boolean);
}

export function blockValue(block: FrontmatterBlock): FieldValue {
  const lines = block.raw.split(/\r?\n/);
  // Leading comment lines may be attached to the block; find the real key line.
  const keyIndex = lines.findIndex((line) => /^[A-Za-z_][\w-]*:/.test(line));
  if (keyIndex < 0) return null;
  const first = lines[keyIndex];
  const inline = first.slice(first.indexOf(":") + 1).trim();
  if (inline) {
    if (inline === "true") return true;
    if (inline === "false") return false;
    if (inline.startsWith("[") && inline.endsWith("]")) {
      return splitInlineList(inline.slice(1, -1)).map(unquote).filter(Boolean);
    }
    return unquote(inline);
  }
  const items: string[] = [];
  for (const line of lines.slice(keyIndex + 1)) {
    const item = /^\s*-\s*(.*)$/.exec(line);
    if (item && item[1].trim()) items.push(unquote(item[1]));
  }
  return items.length ? items : null;
}

export function findBlock(blocks: FrontmatterBlock[], key: string): FrontmatterBlock | undefined {
  return blocks.find((block) => block.key === key);
}

export function stringField(blocks: FrontmatterBlock[], key: string): string {
  const block = findBlock(blocks, key);
  if (!block) return "";
  const value = blockValue(block);
  return typeof value === "string" ? value : "";
}

export function boolField(blocks: FrontmatterBlock[], key: string): boolean {
  const block = findBlock(blocks, key);
  return block ? blockValue(block) === true : false;
}

export function listField(blocks: FrontmatterBlock[], key: string): string[] {
  const block = findBlock(blocks, key);
  if (!block) return [];
  const value = blockValue(block);
  return Array.isArray(value) ? value : typeof value === "string" && value ? [value] : [];
}

export function yamlString(value: string): string {
  return JSON.stringify(value);
}

export interface ManagedField { key: string; value: FieldValue }

export function buildDocument(managed: ManagedField[], preserved: FrontmatterBlock[], body: string): string {
  const lines: string[] = [];
  for (const { key, value } of managed) {
    if (value === null || value === "" || (Array.isArray(value) && value.length === 0)) continue;
    if (typeof value === "boolean") lines.push(`${key}: ${value}`);
    else if (Array.isArray(value)) {
      if (key === "images") {
        lines.push(`${key}:`);
        for (const item of value) lines.push(`  - ${yamlString(item)}`);
      } else {
        lines.push(`${key}: [${value.map(yamlString).join(", ")}]`);
      }
    } else lines.push(`${key}: ${yamlString(value)}`);
  }
  for (const block of preserved) lines.push(block.raw.trimEnd());
  return `---\n${lines.join("\n")}\n---\n\n${body.trim()}\n`;
}