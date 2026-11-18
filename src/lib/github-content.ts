// Browser-side GitHub storage for the /write/ admin page. Commits land on
// codex/static, then a merge into main triggers the existing Pages workflow.

export const GH_OWNER = "dingzhencoding";
export const GH_REPO = "personal-blog-template";
export const DEV_BRANCH = "codex/static";
export const PUBLISH_BRANCH = "main";
export const REPO_URL = `https://github.com/${GH_OWNER}/${GH_REPO}`;
export const ACTIONS_URL = `${REPO_URL}/actions/workflows/pages.yml`;
export const TOKEN_CREATE_URL = "https://github.com/settings/personal-access-tokens/new";

const API = "https://api.github.com";
const REPO = `/repos/${GH_OWNER}/${GH_REPO}`;

// The PAT is stored AES-GCM-encrypted with the admin password. The lock file
// is public, so password strength is the only thing protecting the token.
export const LOCK_PATH = "public/admin-lock.json";
const PBKDF2_ITERATIONS = 600000;

export interface AdminLock {
  v: 1;
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

export class GitHubError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function toError(response: Response): Promise<GitHubError> {
  const body = await response.json().catch(() => null) as { message?: string } | null;
  const detail = body?.message ?? "";
  let message: string;
  if (response.status === 401) message = "令牌无效或已过期，请退出后点「重新设置」用新令牌初始化。";
  else if (response.status === 403) message = /rate limit/i.test(detail)
    ? "GitHub API 请求次数已达上限，请稍后再试。"
    : "令牌没有执行此操作的权限，请确认已授权本仓库的 Contents 读写（Read and write）。";
  else if (response.status === 404) message = "找不到仓库、分支或文件，请确认令牌已授权本仓库。";
  else if (response.status === 409) message = "codex/static 与 main 出现合并冲突，请先在 GitHub 上手动合并后再试。";
  else if (response.status === 422) message = "GitHub 拒绝了这次提交（远端分支可能刚有更新），请刷新页面后重试。";
  else message = detail ? `GitHub：${detail}` : `请求失败（${response.status}）。`;
  return new GitHubError(message, response.status);
}

function headers(token: string, accept = "application/vnd.github+json"): Record<string, string> {
  return { Authorization: `Bearer ${token}`, Accept: accept, "X-GitHub-Api-Version": "2022-11-28" };
}

async function request(token: string, path: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      ...init,
      headers: { ...headers(token), ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
    });
  } catch {
    throw new GitHubError("无法连接 GitHub，请检查网络后重试。", 0);
  }
  if (!response.ok) throw await toError(response);
  return response;
}

async function json<T>(response: Response): Promise<T> {
  return await response.json() as T;
}

export async function validateToken(token: string): Promise<void> {
  await request(token, REPO);
}

export interface RepoFile { path: string; size: number }

export async function listRepoFiles(token: string): Promise<RepoFile[]> {
  const ref = await json<{ object: { sha: string } }>(await request(token, `${REPO}/git/ref/heads/${DEV_BRANCH}`));
  const tree = await json<{ truncated?: boolean; tree: Array<{ path: string; type: string; size?: number }> }>(
    await request(token, `${REPO}/git/trees/${ref.object.sha}?recursive=1`),
  );
  if (tree.truncated) throw new GitHubError("仓库文件列表过大，无法完整加载。", 0);
  return tree.tree.filter((item) => item.type === "blob").map((item) => ({ path: item.path, size: item.size ?? 0 }));
}

export async function readTextFile(token: string, path: string): Promise<string | null> {
  let response: Response;
  try {
    response = await fetch(`${API}${REPO}/contents/${path}?ref=${encodeURIComponent(DEV_BRANCH)}`, {
      headers: headers(token, "application/vnd.github.raw+json"),
    });
  } catch {
    throw new GitHubError("无法连接 GitHub，请检查网络后重试。", 0);
  }
  if (response.status === 404) return null;
  if (!response.ok) throw await toError(response);
  return response.text();
}

export interface FileChange {
  path: string;
  /** null deletes the file. */
  content: string | Uint8Array | null;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  if (!globalThis.crypto?.subtle) {
    throw new GitHubError("当前环境不支持加密，请通过 https://blog.noova.cloud 或 localhost 访问。", 0);
  }
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Read the lock file; null when not set up yet. Prefers the site's own origin
 *  (the lock ships in public/) because GitHub APIs are rate-limited or blocked
 *  on some networks; falls back to the contents API before the first deploy. */
export async function fetchAdminLock(): Promise<AdminLock | null> {
  let response: Response | null = null;
  try {
    response = await fetch(new URL("/admin-lock.json", window.location.origin), { cache: "no-store" });
  } catch { /* fall through to the GitHub API */ }
  if (response && response.status === 404) return null;
  if (!response || !response.ok) {
    try {
      response = await fetch(`${API}${REPO}/contents/${LOCK_PATH}?ref=${encodeURIComponent(DEV_BRANCH)}`, {
        cache: "no-store",
        headers: { Accept: "application/vnd.github.raw+json", "X-GitHub-Api-Version": "2022-11-28" },
      });
    } catch {
      throw new GitHubError("无法连接 GitHub，请检查网络后重试。", 0);
    }
    if (response.status === 404) return null;
    if (!response.ok) throw new GitHubError(`读取管理配置失败（${response.status}），请稍后重试。`, response.status);
  }
  return await response.json() as AdminLock;
}

export async function encryptAdminLock(token: string, password: string): Promise<AdminLock> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(token));
  return {
    v: 1,
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptAdminLock(lock: AdminLock, password: string): Promise<string> {
  const key = await deriveKey(password, fromBase64(lock.salt), lock.iterations);
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(lock.iv) }, key, fromBase64(lock.ciphertext));
  } catch {
    throw new GitHubError("密码不正确。", 0);
  }
  return new TextDecoder().decode(plain);
}

export function lockFileContent(lock: AdminLock): string {
  return `${JSON.stringify(lock, null, 2)}\n`;
}

/** One atomic commit on codex/static via the Git Data API (any file size ≤ 100 MB). */
export async function commitChanges(token: string, changes: FileChange[], message: string): Promise<string> {
  if (changes.length === 0) throw new GitHubError("没有需要提交的内容。", 0);
  const ref = await json<{ object: { sha: string } }>(await request(token, `${REPO}/git/ref/heads/${DEV_BRANCH}`));
  const head = ref.object.sha;
  const commit = await json<{ tree: { sha: string } }>(await request(token, `${REPO}/git/commits/${head}`));
  const treeEntries: Array<{ path: string; mode: string; type: string; sha: string | null }> = await Promise.all(changes.map(async (change) => {
    if (change.content === null) return { path: change.path, mode: "100644", type: "blob", sha: null };
    const binary = typeof change.content !== "string";
    const blob = await json<{ sha: string }>(await request(token, `${REPO}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({
        content: binary ? bytesToBase64(change.content as Uint8Array) : change.content,
        encoding: binary ? "base64" : "utf-8",
      }),
    }));
    return { path: change.path, mode: "100644", type: "blob", sha: blob.sha };
  }));
  const tree = await json<{ sha: string }>(await request(token, `${REPO}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: commit.tree.sha, tree: treeEntries }),
  }));
  const created = await json<{ sha: string }>(await request(token, `${REPO}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message, tree: tree.sha, parents: [head] }),
  }));
  await request(token, `${REPO}/git/refs/heads/${DEV_BRANCH}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: created.sha }),
  });
  return created.sha;
}

export async function mergeToPublish(token: string): Promise<void> {
  await request(token, `${REPO}/merges`, {
    method: "POST",
    body: JSON.stringify({ base: PUBLISH_BRANCH, head: DEV_BRANCH, commit_message: "Publish content from the online editor" }),
  });
}

/** Commit to codex/static and merge into main so Actions rebuilds the site. */
export async function commitAndPublish(token: string, changes: FileChange[], message: string): Promise<void> {
  await commitChanges(token, changes, message);
  await mergeToPublish(token);
}