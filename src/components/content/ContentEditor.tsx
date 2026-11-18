"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MarkdownPre } from "./Markdown";
import {
  ACTIONS_URL, DEV_BRANCH, GH_OWNER, GH_REPO, LOCK_PATH, PUBLISH_BRANCH, TOKEN_CREATE_URL,
  commitAndPublish, decryptAdminLock, encryptAdminLock, fetchAdminLock, listRepoFiles, lockFileContent, readTextFile, validateToken,
  type AdminLock, type FileChange, type RepoFile,
} from "@/lib/github-content";
import {
  boolField, buildDocument, listField, splitDocument, stringField,
  type FrontmatterBlock, type ManagedField,
} from "@/lib/content/frontmatter";
import "./ContentEditor.css";

type Tab = "article" | "moment" | "resume";
type EntryTab = "article" | "moment";

interface EntrySummary { path: string; slug: string; title: string; date: string; draft: boolean; raw: string }
interface EditorForm { title: string; summary: string; slug: string; date: string; bodyMd: string; tagsText: string; images: string[] }
interface StagedImage { bytes: Uint8Array; objectUrl: string }

const MANAGED_ARTICLE = ["title", "slug", "date", "summary", "tags", "updated", "draft"];
const MANAGED_MOMENT = [...MANAGED_ARTICLE, "images"];
const RESUME_PDF = "content/resume/resume.pdf";
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function beijingParts(): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", timeZone: "Asia/Shanghai",
  }).formatToParts(new Date());
  const result: Record<string, string> = {};
  for (const part of parts) result[part.type] = part.value;
  return result;
}

function today(): string {
  const p = beijingParts();
  return `${p.year}-${p.month}-${p.day}`;
}

function generateSlug(type: EntryTab): string {
  const p = beijingParts();
  return `${type === "article" ? "post" : "life"}-${p.year}${p.month}${p.day}-${p.hour}${p.minute}${p.second}`;
}

function blankForm(): EditorForm {
  return { title: "", summary: "", slug: "", date: today(), bodyMd: "", tagsText: "", images: [] };
}

function baseName(path: string): string {
  return (path.split("/").pop() ?? "").replace(/\.md$/i, "");
}

function dirFor(type: EntryTab): string {
  return type === "article" ? "articles" : "life";
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : "操作失败，请稍后重试。";
}

function publishNotice(text: string): ReactNode {
  return <>{text}已提交到 {DEV_BRANCH} 并合并到 {PUBLISH_BRANCH}，GitHub Actions 自动构建约 1–2 分钟后生效。<a href={ACTIONS_URL} target="_blank" rel="noopener noreferrer">查看构建状态 ↗</a></>;
}

async function loadEntries(token: string, repoFiles: RepoFile[], type: EntryTab): Promise<EntrySummary[]> {
  const dir = `content/${dirFor(type)}/`;
  const paths = repoFiles
    .filter((file) => file.path.startsWith(dir) && /\.md$/i.test(file.path) && !file.path.endsWith("_example.md"))
    .map((file) => file.path);
  const loaded = await Promise.all(paths.map(async (path): Promise<EntrySummary | null> => {
    const raw = await readTextFile(token, path);
    if (raw === null) return null;
    const { blocks } = splitDocument(raw);
    const slug = stringField(blocks, "slug") || baseName(path);
    return {
      path, slug,
      title: stringField(blocks, "title") || slug,
      date: stringField(blocks, "date").slice(0, 10),
      draft: boolField(blocks, "draft"),
      raw,
    };
  }));
  return loaded.filter((entry): entry is EntrySummary => entry !== null)
    .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug, "en"));
}

/** Downscale and re-encode photos so the public repo stays light; GIFs keep animation. */
async function prepareImage(file: File): Promise<{ bytes: Uint8Array; ext: string }> {
  if (file.type === "image/gif") {
    if (file.size > 5 * 1024 * 1024) throw new Error("GIF 动图不能超过 5MB。");
    return { bytes: new Uint8Array(await file.arrayBuffer()), ext: "gif" };
  }
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas unavailable");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const webp = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
    if (webp && webp.type === "image/webp") return { bytes: new Uint8Array(await webp.arrayBuffer()), ext: "webp" };
    const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (jpeg) return { bytes: new Uint8Array(await jpeg.arrayBuffer()), ext: "jpg" };
  } catch { /* fall back to the original bytes below */ }
  if (file.size > 10 * 1024 * 1024) throw new Error("图片不能超过 10MB。");
  const ext = (file.name.split(".").pop() ?? "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  return { bytes: new Uint8Array(await file.arrayBuffer()), ext };
}

export default function ContentEditor() {
  const [phase, setPhase] = useState<"loading" | "setup" | "login" | "editor">("loading");
  const [token, setToken] = useState("");
  const [lock, setLock] = useState<AdminLock | null>(null);
  const [patInput, setPatInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [pwPanelOpen, setPwPanelOpen] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [newPwConfirm, setNewPwConfirm] = useState("");
  const [tab, setTab] = useState<Tab>("article");
  const [files, setFiles] = useState<RepoFile[]>([]);
  const [entries, setEntries] = useState<EntrySummary[]>([]);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [originalSlug, setOriginalSlug] = useState("");
  const [savedDraft, setSavedDraft] = useState<boolean | null>(null);
  const [form, setForm] = useState<EditorForm>(blankForm);
  const [preserved, setPreserved] = useState<FrontmatterBlock[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<ReactNode>("");
  const stagedRef = useRef<Map<string, StagedImage>>(new Map());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const pendingSlugRef = useRef("");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const queryTab: Tab = params.get("type") === "moment" ? "moment" : params.get("type") === "resume" ? "resume" : "article";
    pendingSlugRef.current = params.get("slug") ?? "";
    setTab(queryTab);
    void (async () => {
      try {
        const existing = await fetchAdminLock();
        if (!active) return;
        setLock(existing);
        setPhase(existing ? "login" : "setup");
      } catch (cause) {
        if (!active) return;
        setError(errorMessage(cause));
        setPhase("login");
      }
    })();
    const staged = stagedRef.current;
    return () => {
      active = false;
      staged.forEach((image) => URL.revokeObjectURL(image.objectUrl));
      staged.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateUrl(nextTab: Tab, slug: string | null): void {
    const params = new URLSearchParams({ type: nextTab });
    if (slug) params.set("slug", slug);
    window.history.replaceState(null, "", `/write/?${params}`);
  }

  function clearStaged(): void {
    stagedRef.current.forEach((image) => URL.revokeObjectURL(image.objectUrl));
    stagedRef.current = new Map();
  }

  function applyEntry(entry: EntrySummary, type: EntryTab): void {
    const { blocks, body } = splitDocument(entry.raw);
    const managed = type === "moment" ? MANAGED_MOMENT : MANAGED_ARTICLE;
    setPreserved(blocks.filter((block) => !managed.includes(block.key)));
    setCurrentPath(entry.path);
    setOriginalSlug(entry.slug);
    setSavedDraft(entry.draft);
    setForm({
      title: stringField(blocks, "title"),
      summary: stringField(blocks, "summary"),
      slug: entry.slug,
      date: stringField(blocks, "date").slice(0, 10) || today(),
      bodyMd: body.trim(),
      tagsText: listField(blocks, "tags").join("，"),
      images: type === "moment" ? listField(blocks, "images") : [],
    });
    setError(""); setNotice("");
  }

  function resetForm(): void {
    setCurrentPath(null);
    setOriginalSlug("");
    setSavedDraft(null);
    setForm(blankForm());
    setPreserved([]);
  }

  function confirmDiscardStaged(): boolean {
    return stagedRef.current.size === 0 || window.confirm("还有已上传但未保存的图片，离开后会丢弃。继续吗？");
  }

  function chooseEntry(entry: EntrySummary): void {
    if (tab === "resume" || !confirmDiscardStaged()) return;
    clearStaged();
    applyEntry(entry, tab);
    updateUrl(tab, entry.slug);
  }

  function newEntry(): void {
    if (tab === "resume" || !confirmDiscardStaged()) return;
    clearStaged();
    resetForm();
    setError(""); setNotice("");
    updateUrl(tab, null);
  }

  function switchTab(next: Tab): void {
    if (next === tab || busy || !confirmDiscardStaged()) return;
    clearStaged();
    setTab(next);
    setError(""); setNotice("");
    updateUrl(next, null);
    if (next === "resume") return;
    resetForm();
    void (async () => {
      try { setEntries(await loadEntries(token, files, next)); }
      catch (cause) { setError(errorMessage(cause)); }
    })();
  }

  async function enterEditor(value: string): Promise<void> {
    const repoFiles = await listRepoFiles(value);
    setToken(value);
    setFiles(repoFiles);
    if (tab !== "resume") {
      const loaded = await loadEntries(value, repoFiles, tab);
      setEntries(loaded);
      const slug = pendingSlugRef.current;
      pendingSlugRef.current = "";
      const match = slug ? loaded.find((entry) => entry.slug === slug) : undefined;
      if (match) applyEntry(match, tab);
    }
    setPhase("editor");
  }

  async function unlock(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (busy || !loginPassword) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const current = lock ?? await fetchAdminLock();
      if (!current) { setPhase("setup"); return; }
      setLock(current);
      const value = await decryptAdminLock(current, loginPassword);
      await validateToken(value);
      setLoginPassword("");
      await enterEditor(value);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  }

  async function setup(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (busy) return;
    const pat = patInput.trim();
    if (!pat) { setError("请填写 GitHub 访问令牌。"); return; }
    if (passwordInput.length < 8) { setError("管理密码至少 8 位，建议 12 位以上并混合字母、数字和符号。"); return; }
    if (passwordInput !== passwordConfirm) { setError("两次输入的密码不一致。"); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      await validateToken(pat);
      const created = await encryptAdminLock(pat, passwordInput);
      await commitAndPublish(pat, [{ path: LOCK_PATH, content: lockFileContent(created) }], "初始化内容管理密码锁");
      setLock(created);
      setPatInput(""); setPasswordInput(""); setPasswordConfirm("");
      await enterEditor(pat);
      setNotice("初始化完成。以后点「＋」只需输入管理密码即可进入。");
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (busy || !token) return;
    if (newPw.length < 8) { setError("新密码至少 8 位，建议 12 位以上并混合字母、数字和符号。"); return; }
    if (newPw !== newPwConfirm) { setError("两次输入的新密码不一致。"); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const created = await encryptAdminLock(token, newPw);
      await commitAndPublish(token, [{ path: LOCK_PATH, content: lockFileContent(created) }], "更新内容管理密码");
      setLock(created);
      setPwPanelOpen(false); setNewPw(""); setNewPwConfirm("");
      setNotice(publishNotice("管理密码已更新，下次进入请使用新密码。"));
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  }

  function logout(): void {
    clearStaged();
    setToken("");
    setFiles([]);
    setEntries([]);
    resetForm();
    setLoginPassword("");
    setPwPanelOpen(false);
    setError(""); setNotice("");
    setPhase(lock ? "login" : "setup");
  }

  async function refreshRepo(type: Tab): Promise<EntrySummary[] | null> {
    const repoFiles = await listRepoFiles(token);
    setFiles(repoFiles);
    if (type === "resume") return null;
    const loaded = await loadEntries(token, repoFiles, type);
    setEntries(loaded);
    return loaded;
  }

  function parsedTags(): string[] {
    return [...new Set(form.tagsText.split(/[,，\n]/).map((tag) => tag.trim()).filter(Boolean))];
  }

  async function save(draft: boolean): Promise<void> {
    if (busy || uploading || tab === "resume") return;
    const type: EntryTab = tab;
    const title = form.title.trim();
    if (!title) { setError("请先填写标题。"); return; }
    if (!form.bodyMd.trim()) { setError("请先填写正文。"); return; }
    const tags = parsedTags();
    if (tags.length > 12) { setError("标签最多填写 12 个。"); return; }
    if (type === "moment" && form.images.length > 12) { setError("每条生活记录最多 12 张图片。"); return; }
    const date = form.date || today();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { setError("发布日期格式不正确。"); return; }
    const slug = form.slug.trim() || generateSlug(type);
    if (!SLUG_PATTERN.test(slug) || slug.length > 120) { setError("链接标识只能用小写英文、数字和连字符，不超过 120 字符。"); return; }
    const targetPath = currentPath && slug === originalSlug ? currentPath : `content/${dirFor(type)}/${slug}.md`;
    if (entries.some((entry) => entry.slug === slug && entry.path !== currentPath)
      || (targetPath !== currentPath && files.some((file) => file.path === targetPath))) {
      setError(`链接标识 ${slug} 已被占用，请换一个。`);
      return;
    }
    const managed: ManagedField[] = [
      { key: "title", value: title },
      { key: "slug", value: slug },
      { key: "date", value: date },
      { key: "summary", value: form.summary.trim() },
      { key: "tags", value: tags },
      ...(currentPath ? [{ key: "updated", value: today() }] : []),
      ...(type === "moment" ? [{ key: "images", value: form.images }] : []),
      { key: "draft", value: draft },
    ];
    const markdown = buildDocument(managed, preserved, form.bodyMd);
    const changes: FileChange[] = [];
    stagedRef.current.forEach((image, publicPath) => {
      const used = type === "moment" ? form.images.includes(publicPath) : form.bodyMd.includes(publicPath);
      if (used) changes.push({ path: `public${publicPath}`, content: image.bytes });
    });
    changes.push({ path: targetPath, content: markdown });
    if (currentPath && targetPath !== currentPath) changes.push({ path: currentPath, content: null });
    setBusy(true); setError(""); setNotice("");
    try {
      await commitAndPublish(token, changes, `${draft ? "草稿" : currentPath ? "更新" : "发布"}：${title}`);
      const loaded = await refreshRepo(type);
      const saved = loaded?.find((entry) => entry.path === targetPath);
      if (saved) applyEntry(saved, type);
      else { setCurrentPath(targetPath); setOriginalSlug(slug); setSavedDraft(draft); setForm((prev) => ({ ...prev, slug })); }
      clearStaged();
      updateUrl(type, slug);
      setNotice(publishNotice(draft ? "草稿已保存（draft: true 的记录不会出现在网站上）。" : "已发布。"));
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  }

  async function removeEntry(): Promise<void> {
    if (!currentPath || busy || tab === "resume") return;
    if (!window.confirm(`确定删除《${form.title || originalSlug}》吗？删除会同步到线上，无法恢复。`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await commitAndPublish(token, [{ path: currentPath, content: null }], `删除：${form.title || originalSlug}`);
      await refreshRepo(tab);
      clearStaged();
      resetForm();
      updateUrl(tab, null);
      setNotice(publishNotice("记录已删除。"));
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  }

  async function uploadImage(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file || uploading || tab === "resume") return;
    const type: EntryTab = tab;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      setError("只支持 JPG / PNG / WebP / GIF 图片。");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (type === "moment" && form.images.length >= 12) {
      setError("每条生活记录最多 12 张图片。");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    const start = textareaRef.current?.selectionStart ?? form.bodyMd.length;
    const end = textareaRef.current?.selectionEnd ?? start;
    setUploading(true); setError(""); setNotice("");
    try {
      const { bytes, ext } = await prepareImage(file);
      const p = beijingParts();
      const publicPath = `/images/uploads/${p.year}${p.month}${p.day}-${p.hour}${p.minute}${p.second}-${Math.random().toString(16).slice(2, 6)}.${ext}`;
      const objectUrl = URL.createObjectURL(new Blob([bytes as BlobPart], { type: file.type === "image/gif" ? "image/gif" : ext === "webp" ? "image/webp" : "image/jpeg" }));
      stagedRef.current.set(publicPath, { bytes, objectUrl });
      if (type === "article") {
        const safeName = file.name.replace(/[\[\]\n\r]/g, " ");
        const before = form.bodyMd.slice(0, start);
        const leading = before.length > 0 && !before.endsWith("\n") ? "\n\n" : "";
        const markdown = `${leading}![${safeName}](${publicPath})`;
        setForm((prev) => ({ ...prev, bodyMd: `${prev.bodyMd.slice(0, start)}${markdown}${prev.bodyMd.slice(end)}` }));
        requestAnimationFrame(() => {
          textareaRef.current?.focus();
          textareaRef.current?.setSelectionRange(start + markdown.length, start + markdown.length);
        });
        setNotice("图片已插入正文并暂存，保存记录时一并提交到仓库。");
      } else {
        setForm((prev) => ({ ...prev, images: [...prev.images, publicPath] }));
        setNotice("图片已加入记录并暂存，保存记录时一并提交到仓库。");
      }
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  function removeMomentImage(publicPath: string): void {
    setForm((prev) => ({ ...prev, images: prev.images.filter((item) => item !== publicPath) }));
    const staged = stagedRef.current.get(publicPath);
    if (staged) {
      URL.revokeObjectURL(staged.objectUrl);
      stagedRef.current.delete(publicPath);
    }
  }

  async function uploadPdf(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file || busy) return;
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
      setError("请选择 PDF 文件。");
      if (pdfRef.current) pdfRef.current.value = "";
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("PDF 不能超过 20MB。");
      if (pdfRef.current) pdfRef.current.value = "";
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const replacing = files.some((item) => item.path === RESUME_PDF);
      await commitAndPublish(token, [{ path: RESUME_PDF, content: bytes }], replacing ? "替换简历 PDF" : "上传简历 PDF");
      await refreshRepo("resume");
      setNotice(publishNotice(replacing ? "简历 PDF 已替换。" : "简历 PDF 已上传。"));
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); if (pdfRef.current) pdfRef.current.value = ""; }
  }

  async function deletePdf(): Promise<void> {
    if (busy || !files.some((file) => file.path === RESUME_PDF)) return;
    if (!window.confirm("确定删除简历 PDF 吗？删除后「下载 PDF」和在线查看将不可用。")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await commitAndPublish(token, [{ path: RESUME_PDF, content: null }], "删除简历 PDF");
      await refreshRepo("resume");
      setNotice(publishNotice("简历 PDF 已删除。"));
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  }

  const label = tab === "article" ? "技术学习" : tab === "moment" ? "日常生活" : "简历";
  const backHref = tab === "article" ? "/moments/tech/" : tab === "moment" ? "/moments/life/" : "/resume/";
  const resumePdf = files.find((file) => file.path === RESUME_PDF);

  if (phase === "loading") {
    return <main className="content-editor content-editor--center"><p role="status">正在打开内容管理…</p></main>;
  }

  if (phase === "setup") return (
    <main className="content-editor content-editor--center">
      <div className="content-editor__login">
        <a className="content-editor__back" href="/">← 返回首页</a>
        <p className="content-editor__eyebrow">PRIVATE DESK / 作者空间</p>
        <h1>初始化内容管理</h1>
        <p>首次使用需要一次性设置：填入 GitHub 令牌并设定管理密码。令牌会用密码加密后存进仓库，以后进入只需输入管理密码。</p>
        {error && <div className="content-editor__alert" role="alert">{error}</div>}
        <form onSubmit={setup}>
          <label htmlFor="content-editor-pat">GitHub 访问令牌（仅此一次）</label>
          <input id="content-editor-pat" type="password" autoComplete="off" value={patInput} onChange={(event) => setPatInput(event.target.value)} placeholder="github_pat_…" required disabled={busy} />
          <label htmlFor="content-editor-new-pw">管理密码（至少 8 位，建议 12 位以上）</label>
          <input id="content-editor-new-pw" type="password" autoComplete="new-password" value={passwordInput} onChange={(event) => setPasswordInput(event.target.value)} minLength={8} required disabled={busy} />
          <label htmlFor="content-editor-new-pw2">确认管理密码</label>
          <input id="content-editor-new-pw2" type="password" autoComplete="new-password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} minLength={8} required disabled={busy} />
          <button type="submit" disabled={busy}>{busy ? "正在初始化…" : "设置密码并进入"}</button>
        </form>
        <div className="content-editor__token-help">
          <p><a href={TOKEN_CREATE_URL} target="_blank" rel="noopener noreferrer">在 GitHub 创建细粒度令牌 ↗</a>（Settings → Developer settings → Personal access tokens → Fine-grained tokens）：</p>
          <ol>
            <li>Repository access 选 Only select repositories，勾选 {GH_REPO}。</li>
            <li>Permissions → Repository permissions → Contents 设为 Read and write。</li>
            <li>设置过期时间（建议不超过 90 天），生成后粘贴到上方。过期后在登录页点「重新设置」换新令牌。</li>
          </ol>
          <p>加密后的令牌存放在公开仓库中，密码强度是唯一的保护，请勿使用弱密码。密码和令牌都只在本浏览器使用，不会发送到第三方服务器。</p>
        </div>
        {lock && <button type="button" className="content-editor__reset-link" onClick={() => { setPhase("login"); setError(""); }}>← 返回密码登录</button>}
      </div>
    </main>
  );

  if (phase === "login") return (
    <main className="content-editor content-editor--center">
      <div className="content-editor__login">
        <a className="content-editor__back" href="/">← 返回首页</a>
        <p className="content-editor__eyebrow">PRIVATE DESK / 作者空间</p>
        <h1>内容管理</h1>
        <p>输入管理密码解锁。内容会提交到 {GH_OWNER}/{GH_REPO} 的 {DEV_BRANCH} 分支，并自动合并到 {PUBLISH_BRANCH} 触发发布。</p>
        {error && <div className="content-editor__alert" role="alert">{error}</div>}
        <form onSubmit={unlock}>
          <label htmlFor="content-editor-password">管理密码</label>
          <input id="content-editor-password" type="password" autoComplete="current-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} required disabled={busy} />
          <button type="submit" disabled={busy}>{busy ? "正在解锁…" : "解锁进入"}</button>
        </form>
        <button type="button" className="content-editor__reset-link" onClick={() => { setPhase("setup"); setError(""); setPatInput(""); setPasswordInput(""); setPasswordConfirm(""); }}>令牌过期或忘记密码？重新设置</button>
      </div>
    </main>
  );

  return (
    <main className="content-editor">
      <div className="content-editor__shell">
        <header className="content-editor__header">
          <div>
            <a className="content-editor__back" href={backHref}>← 返回{label}{tab === "resume" ? "" : "记录"}</a>
            <p className="content-editor__eyebrow">PRIVATE DESK / 作者空间 · {DEV_BRANCH} → {PUBLISH_BRANCH}</p>
            <h1>{label} · {tab === "resume" ? "管理" : "记录"}</h1>
          </div>
          <div className="content-editor__header-actions">
            <button type="button" className={tab === "article" ? "is-active" : ""} onClick={() => switchTab("article")}>技术学习</button>
            <button type="button" className={tab === "moment" ? "is-active" : ""} onClick={() => switchTab("moment")}>日常生活</button>
            <button type="button" className={tab === "resume" ? "is-active" : ""} onClick={() => switchTab("resume")}>简历</button>
            <button type="button" onClick={() => { setPwPanelOpen((open) => !open); setError(""); }} disabled={busy}>改密码</button>
            <button type="button" onClick={logout} disabled={busy}>退出</button>
          </div>
        </header>

        {pwPanelOpen && (
          <form className="content-editor__pw-panel" onSubmit={changePassword}>
            <label>新密码<input type="password" autoComplete="new-password" value={newPw} onChange={(event) => setNewPw(event.target.value)} minLength={8} required disabled={busy} /></label>
            <label>确认新密码<input type="password" autoComplete="new-password" value={newPwConfirm} onChange={(event) => setNewPwConfirm(event.target.value)} minLength={8} required disabled={busy} /></label>
            <div>
              <button type="submit" disabled={busy}>{busy ? "正在保存…" : "保存新密码"}</button>
              <button type="button" onClick={() => { setPwPanelOpen(false); setNewPw(""); setNewPwConfirm(""); }} disabled={busy}>取消</button>
            </div>
          </form>
        )}

        {error && <div className="content-editor__alert" role="alert">{error}</div>}
        {notice && <div className="content-editor__notice" role="status">{notice}</div>}

        {tab === "resume" ? (
          <section className="content-editor__resume" aria-label="简历管理">
            <div className="content-editor__resume-status">
              <span>PDF 简历 resume.pdf：<strong>{resumePdf ? `已存在（${resumePdf.size >= 1024 * 1024 ? `${(resumePdf.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(resumePdf.size / 1024))} KB`}）` : "未上传"}</strong></span>
              <p>简历页只展示 PDF：上传后在线预览、下载与新窗口查看都会生效；未上传时显示「简历整理中」。</p>
            </div>

            <div className="content-editor__resume-card">
              <h2>PDF 简历</h2>
              <p>上传新 PDF 会直接替换现有文件，适合投递用的排版版本。</p>
              <div className="content-editor__resume-actions">
                <button type="button" onClick={() => pdfRef.current?.click()} disabled={busy}>{busy ? "正在处理…" : resumePdf ? "替换 PDF" : "上传 PDF"}</button>
                <input ref={pdfRef} className="content-editor__file" type="file" accept="application/pdf,.pdf" onChange={uploadPdf} />
                {resumePdf && <button type="button" className="content-editor__delete" onClick={deletePdf} disabled={busy}>删除 PDF</button>}
                {resumePdf && <a href="/files/resume.pdf" target="_blank" rel="noopener noreferrer">查看当前线上 PDF ↗</a>}
                <a href="/resume/" target="_blank" rel="noopener noreferrer">查看线上简历页 ↗</a>
              </div>
              <p className="content-editor__resume-hint">提交后 GitHub Actions 自动构建约 1–2 分钟生效；构建失败时网站会保留上一个版本。</p>
            </div>
          </section>
        ) : (
          <div className="content-editor__layout">
            <aside className="content-editor__sidebar" aria-label="记录列表">
              <div className="content-editor__sidebar-top"><h2>我的记录 <span>{entries.length}</span></h2><button type="button" onClick={newEntry}>＋ 新建</button></div>
              {entries.length === 0 ? <p className="content-editor__list-empty">还没有记录。写下第一篇吧。</p> : (
                <div className="content-editor__entry-list">
                  {entries.map((entry) => (
                    <button className={entry.path === currentPath ? "is-current" : ""} type="button" key={entry.path} onClick={() => chooseEntry(entry)}>
                      <span className="content-editor__entry-status">{entry.draft ? "草稿" : "已发布"}</span>
                      <strong>{entry.title}</strong>
                      <small>{entry.date}</small>
                    </button>
                  ))}
                </div>
              )}
            </aside>

            <section className="content-editor__work" aria-label="编辑记录">
              <div className="content-editor__work-head">
                <div><p className="content-editor__eyebrow">{currentPath === null ? "NEW ENTRY" : "EDIT ENTRY"}</p><h2>{currentPath === null ? "新建记录" : "编辑记录"}</h2></div>
                {savedDraft !== null && <span className={`content-editor__status${savedDraft ? "" : " content-editor__status--published"}`}>{savedDraft ? "草稿" : "已发布"}</span>}
              </div>

              <div className="content-editor__fields">
                <label>标题 <span>必填</span><input value={form.title} maxLength={180} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={tab === "article" ? "这次学到了什么？" : "今天想记下什么？"} /></label>
                <label>摘要 <span>最多 600 字</span><textarea className="content-editor__summary" value={form.summary} maxLength={600} onChange={(event) => setForm({ ...form, summary: event.target.value })} placeholder="用一两句话概括这篇记录" /></label>
                <div className="content-editor__field-row">
                  <label>链接标识 <span>留空自动生成 · 小写英文数字连字符</span><input value={form.slug} maxLength={120} onChange={(event) => setForm({ ...form, slug: event.target.value.toLowerCase() })} placeholder="my-first-post" spellCheck={false} /></label>
                  <label>标签 <span>用逗号分隔，最多 12 个</span><input value={form.tagsText} onChange={(event) => setForm({ ...form, tagsText: event.target.value })} placeholder="学习笔记，Next.js" /></label>
                  <label>发布日期 <span>北京时间</span><input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
                </div>

                <div className="content-editor__body-head"><label htmlFor="content-editor-body">正文 <span>Markdown · Mermaid</span></label><button type="button" onClick={() => fileRef.current?.click()} disabled={uploading || busy}>{uploading ? "正在处理图片…" : "＋ 上传图片"}</button><input ref={fileRef} className="content-editor__file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadImage} /></div>
                <div className="content-editor__panes">
                  <textarea ref={textareaRef} id="content-editor-body" className="content-editor__markdown" value={form.bodyMd} onChange={(event) => setForm({ ...form, bodyMd: event.target.value })} placeholder={tab === "article" ? "# 开始写作\n\n用 Markdown 记录思路、代码和图片…" : "写下此刻的想法…"} spellCheck={false} />
                  <div className="content-editor__preview" aria-label="Markdown 实时预览"><p className="content-editor__preview-label">实时预览</p>{form.bodyMd.trim() ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{
                      pre: MarkdownPre,
                      img: ({ src, alt }) => <img src={typeof src === "string" ? stagedRef.current.get(src)?.objectUrl ?? src : src} alt={alt ?? ""} />,
                    }}>{form.bodyMd}</ReactMarkdown>
                  ) : <p className="content-editor__preview-empty">正文预览会显示在这里。使用 ```mermaid 代码块可以插入图表。</p>}</div>
                </div>

                {tab === "moment" && form.images.length > 0 && (
                  <div className="content-editor__images"><h3>图片 · {form.images.length}/12</h3><div className="content-editor__image-grid">{form.images.map((publicPath) => (
                    <div key={publicPath}><img src={stagedRef.current.get(publicPath)?.objectUrl ?? publicPath} alt="记录图片" /><button type="button" aria-label="移除这张图片" onClick={() => removeMomentImage(publicPath)}>×</button></div>
                  ))}</div></div>
                )}
              </div>

              <div className="content-editor__footer">
                <div>{currentPath !== null && <button className="content-editor__delete" type="button" onClick={removeEntry} disabled={busy || uploading}>删除记录</button>}</div>
                <div className="content-editor__save-actions"><button className="content-editor__draft" type="button" onClick={() => save(true)} disabled={busy || uploading}>{busy ? "正在保存…" : "保存草稿"}</button><button className="content-editor__publish" type="button" onClick={() => save(false)} disabled={busy || uploading}>{busy ? "正在保存…" : savedDraft === false ? "更新发布" : "发布记录"}</button></div>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}