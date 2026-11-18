// Publishes content/resume/resume.pdf and, only when a PDF exists, the pdf.js
// files the in-page viewer loads on demand. Outputs are generated (gitignored).
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const pdf = join(root, "content/resume/resume.pdf");
const filesDir = join(root, "public/files");
const vendorDir = join(root, "public/vendor/pdfjs");
const pdfjs = join(root, "node_modules/pdfjs-dist");

// Both directories are generated (gitignored); start clean every time.
rmSync(filesDir, { recursive: true, force: true });
rmSync(join(root, "public/vendor"), { recursive: true, force: true });

if (existsSync(pdf)) {
  mkdirSync(filesDir, { recursive: true });
  cpSync(pdf, join(filesDir, "resume.pdf"));
  mkdirSync(vendorDir, { recursive: true });
  // The legacy build supports older mobile browsers. Published as .js so any
  // static host serves it with a JavaScript MIME type (required for modules).
  cpSync(join(pdfjs, "legacy/build/pdf.min.mjs"), join(vendorDir, "pdf.min.js"));
  cpSync(join(pdfjs, "legacy/build/pdf.worker.min.mjs"), join(vendorDir, "pdf.worker.min.js"));
  // Character maps and standard fonts for PDFs that do not embed their fonts
  // (common for Chinese text); the viewer fetches only the files it needs.
  cpSync(join(pdfjs, "cmaps"), join(vendorDir, "cmaps"), { recursive: true });
  cpSync(join(pdfjs, "standard_fonts"), join(vendorDir, "standard_fonts"), { recursive: true });
  // Optional decoders (JPEG 2000, JBIG2, colour management), fetched on demand.
  cpSync(join(pdfjs, "wasm"), join(vendorDir, "wasm"), { recursive: true, filter: source => !/LICENSE/.test(source) });
  console.log("resume: published resume.pdf and the PDF viewer");
} else {
  console.log("resume: no content/resume/resume.pdf");
}
