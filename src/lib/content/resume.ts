import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

/**
 * Resume content lives in content/resume/:
 *   resume.md  — frontmatter + Markdown, rendered as the interactive page
 *   resume.pdf — optional; offered for download and shown in a PDF viewer
 * Either file is enough. scripts/prepare-resume.mjs publishes the PDF.
 */
const resumeDir = join(process.cwd(), "content/resume");
export const resumePdfHref = "/files/resume.pdf";

export interface ResumeContact { label: string; value: string; href?: string }
export interface ResumeSkillGroup { group: string; items: string[] }
export interface ResumeStat { value: string; label: string }
export interface ResumeItem { title: string; meta: string; body: string }
export interface ResumeSection { id: string; title: string; intro: string; items: ResumeItem[] }

export interface Resume {
  name: string;
  roles: string[];
  summary: string;
  location: string;
  avatar: string;
  contacts: ResumeContact[];
  skills: ResumeSkillGroup[];
  stats: ResumeStat[];
  sections: ResumeSection[];
  updated: string;
}

export interface ResumeSource {
  resume: Resume | null;
  /** Public URL of the PDF, when content/resume/resume.pdf exists. */
  pdf: string | null;
  pdfUpdated: string;
}

const file = (name: string) => join(resumeDir, name);

function fail(message: string): never {
  throw new Error(`content/resume/resume.md: ${message}`);
}

function str(value: unknown, field: string): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "number") return String(value);
  if (typeof value !== "string") fail(`${field} must be text`);
  return value.trim();
}

function list<T>(value: unknown, field: string, map: (item: Record<string, unknown>, index: number) => T): T[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) fail(`${field} must be a list`);
  return value.map((item, index) => {
    if (!item || typeof item !== "object") fail(`${field}[${index}] must be an object`);
    return map(item as Record<string, unknown>, index);
  });
}

function safeHref(value: string, field: string): string | undefined {
  if (!value) return undefined;
  if (!/^(https?:\/\/|mailto:|tel:|\/)/i.test(value)) fail(`${field} must start with https://, mailto:, tel: or /`);
  return value;
}

/** Splits "Title | 2023.07 – 至今" into title and meta. */
function splitHeading(heading: string): { title: string; meta: string } {
  const index = heading.lastIndexOf(" | ");
  return index < 0 ? { title: heading.trim(), meta: "" } : { title: heading.slice(0, index).trim(), meta: heading.slice(index + 3).trim() };
}

/** `## Section` blocks, each split into `### Entry | meta` timeline items. */
function parseSections(body: string): ResumeSection[] {
  const sections: ResumeSection[] = [];
  let fence = "";
  let section: ResumeSection | null = null;
  let item: ResumeItem | null = null;
  let buffer: string[] = [];
  const flush = () => {
    const text = buffer.join("\n").trim();
    buffer = [];
    if (item) item.body = text;
    else if (section) section.intro = text;
    // Text before the first "##" becomes an untitled introduction.
    else if (text) sections.push({ id: "section-intro", title: "", intro: text, items: [] });
  };
  for (const line of body.split(/\r?\n/)) {
    const fenceMatch = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) fence = fence ? (fenceMatch[1][0] === fence[0] ? "" : fence) : fenceMatch[1];
    const h2 = !fence && /^##\s+(.+?)\s*#*\s*$/.exec(line);
    const h3 = !fence && /^###\s+(.+?)\s*#*\s*$/.exec(line);
    if (h2) {
      flush();
      item = null;
      section = { id: `section-${sections.length + 1}`, title: h2[1], intro: "", items: [] };
      sections.push(section);
    } else if (h3 && section) {
      flush();
      item = { ...splitHeading(h3[1]), body: "" };
      section.items.push(item);
    } else {
      buffer.push(line);
    }
  }
  flush();
  return sections;
}

function readResumeMarkdown(): Resume | null {
  const path = file("resume.md");
  if (!existsSync(path)) return null;
  const { data, content } = matter(readFileSync(path, "utf8"));
  if (data.draft === true) return null;
  const name = str(data.name, "name");
  if (!name) fail("name is required");
  const roles = Array.isArray(data.title) ? data.title.map((role: unknown, i: number) => str(role, `title[${i}]`)).filter(Boolean) : [str(data.title, "title")].filter(Boolean);
  const avatar = str(data.avatar, "avatar");
  if (avatar && (!avatar.startsWith("/images/") || !existsSync(join(process.cwd(), "public", avatar.slice(1))))) fail(`avatar must be an existing /images/ file: ${avatar}`);
  const updatedRaw = data.updated instanceof Date ? data.updated.toISOString().slice(0, 10) : str(data.updated, "updated");
  return {
    name,
    roles,
    summary: str(data.summary, "summary"),
    location: str(data.location, "location"),
    avatar,
    contacts: list(data.contacts, "contacts", (item, i) => ({
      label: str(item.label, `contacts[${i}].label`),
      value: str(item.value, `contacts[${i}].value`),
      href: safeHref(str(item.href, `contacts[${i}].href`), `contacts[${i}].href`),
    })),
    skills: list(data.skills, "skills", (item, i) => ({
      group: str(item.group, `skills[${i}].group`),
      items: Array.isArray(item.items) ? item.items.map((skill, j) => str(skill, `skills[${i}].items[${j}]`)).filter(Boolean) : fail(`skills[${i}].items must be a list`),
    })),
    stats: list(data.stats, "stats", (item, i) => ({ value: str(item.value, `stats[${i}].value`), label: str(item.label, `stats[${i}].label`) })),
    sections: parseSections(content),
    updated: updatedRaw || statSync(path).mtime.toISOString().slice(0, 10),
  };
}

export function loadResume(): ResumeSource {
  const pdfPath = file("resume.pdf");
  const hasPdf = existsSync(pdfPath);
  return {
    resume: readResumeMarkdown(),
    pdf: hasPdf ? resumePdfHref : null,
    pdfUpdated: hasPdf ? statSync(pdfPath).mtime.toISOString().slice(0, 10) : "",
  };
}
