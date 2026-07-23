import type { PracticeArticle } from "@/types/article";

export const CURRENT_ARTICLE_KEY = "econtyper.currentArticle";

export function saveCurrentArticle(article: PracticeArticle): void {
  sessionStorage.setItem(CURRENT_ARTICLE_KEY, JSON.stringify(article));
}

export function getCurrentArticle(): PracticeArticle | null {
  const raw = sessionStorage.getItem(CURRENT_ARTICLE_KEY);
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Partial<PracticeArticle>;
    if (
      typeof value.id !== "string" ||
      typeof value.title !== "string" ||
      typeof value.text !== "string" ||
      typeof value.createdAt !== "string"
    ) {
      throw new Error("Invalid article");
    }
    return value as PracticeArticle;
  } catch {
    sessionStorage.removeItem(CURRENT_ARTICLE_KEY);
    return null;
  }
}
