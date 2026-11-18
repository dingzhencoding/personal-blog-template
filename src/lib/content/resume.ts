import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * The resume is a single PDF at content/resume/resume.pdf.
 * scripts/prepare-resume.mjs publishes it to /files/resume.pdf.
 */
const resumeDir = join(process.cwd(), "content/resume");
export const resumePdfHref = "/files/resume.pdf";

export interface ResumeSource {
  /** Public URL of the PDF, when content/resume/resume.pdf exists. */
  pdf: string | null;
  pdfUpdated: string;
}

export function loadResume(): ResumeSource {
  const pdfPath = join(resumeDir, "resume.pdf");
  const hasPdf = existsSync(pdfPath);
  return {
    pdf: hasPdf ? resumePdfHref : null,
    pdfUpdated: hasPdf ? statSync(pdfPath).mtime.toISOString().slice(0, 10) : "",
  };
}