"use server";

import { extractArticleFromUrl } from "@/lib/article-extractor";
import type { ExtractArticleResult } from "@/types/article";

export async function extractArticle(url: string): Promise<ExtractArticleResult> {
  try {
    const article = await extractArticleFromUrl(url.trim());
    return { ok: true, article };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The article could not be extracted.";
    return { ok: false, message };
  }
}
