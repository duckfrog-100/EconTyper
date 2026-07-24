import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { assertPublicUrl } from "@/lib/url-security";
import type { PracticeArticle } from "@/types/article";

const MAX_REDIRECTS = 4;
const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 10_000;

function normalizeText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function readLimitedBody(response: Response, controller: AbortController): Promise<Uint8Array> {
  if (!response.body) throw new Error("The website returned an empty response.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      controller.abort();
      await reader.cancel().catch(() => undefined);
      throw new Error("The article page is too large to process.");
    }
    chunks.push(value);
  }

  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

async function fetchHtml(input: string): Promise<{ html: string; finalUrl: URL }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let current = await assertPublicUrl(input);

    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      if (controller.signal.aborted) throw new Error("The website took too long to respond.");
      current = await assertPublicUrl(current.toString());

      let response: Response;
      try {
        response = await fetch(current, {
          redirect: "manual",
          signal: controller.signal,
          headers: {
            Accept: "text/html,application/xhtml+xml",
            "User-Agent": "EconTyper/1.0 (+https://github.com/duckfrog-100/EconTyper)",
          },
          cache: "no-store",
        });
      } catch (error) {
        if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
          throw new Error("The website took too long to respond.");
        }
        throw new Error("The website could not be reached.");
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new Error("The website returned an invalid redirect.");
        if (redirects === MAX_REDIRECTS) throw new Error("The website redirected too many times.");
        current = await assertPublicUrl(new URL(location, current).toString());
        continue;
      }

      if (!response.ok) throw new Error("The website blocked or rejected the extraction request.");
      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
        throw new Error("The URL did not return an HTML article.");
      }

      const declaredLength = Number(response.headers.get("content-length") ?? 0);
      if (declaredLength > MAX_BYTES) throw new Error("The article page is too large to process.");

      const body = await readLimitedBody(response, controller);
      return { html: new TextDecoder().decode(body), finalUrl: current };
    }

    throw new Error("The website redirected too many times.");
  } finally {
    clearTimeout(timer);
  }
}

export async function extractArticleFromUrl(input: string): Promise<PracticeArticle> {
  const { html, finalUrl } = await fetchHtml(input);
  const dom = new JSDOM(html, { url: finalUrl.toString() });
  const parsed = new Readability(dom.window.document.cloneNode(true) as Document).parse();
  const text = normalizeText(parsed?.textContent ?? "");

  if (!parsed || text.length < 200) throw new Error("A meaningful article body could not be found.");

  return {
    id: crypto.randomUUID(),
    title: normalizeText(parsed.title || finalUrl.hostname),
    sourceUrl: finalUrl.toString(),
    sourceName: finalUrl.hostname.replace(/^www\./, ""),
    text,
    excerpt: parsed.excerpt ? normalizeText(parsed.excerpt) : undefined,
    byline: parsed.byline ? normalizeText(parsed.byline) : undefined,
    createdAt: new Date().toISOString(),
  };
}
