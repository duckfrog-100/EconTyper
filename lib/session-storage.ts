import type { PracticeArticle } from "@/types/article";

export const CURRENT_ARTICLE_KEY = "econtyper.currentArticle";
const TAB_NAME_PREFIX = "econtyper-tab:";

type StoredArticle = {
  tabId: string;
  article: PracticeArticle;
};

function getTabId(): string {
  if (typeof window === "undefined") return "";
  if (window.name.startsWith(TAB_NAME_PREFIX)) return window.name.slice(TAB_NAME_PREFIX.length);

  const tabId = crypto.randomUUID();
  window.name = `${TAB_NAME_PREFIX}${tabId}`;
  return tabId;
}

export function saveCurrentArticle(article: PracticeArticle): void {
  const value: StoredArticle = { tabId: getTabId(), article };
  sessionStorage.setItem(CURRENT_ARTICLE_KEY, JSON.stringify(value));
}

export function getCurrentArticle(): PracticeArticle | null {
  const raw = sessionStorage.getItem(CURRENT_ARTICLE_KEY);
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Partial<StoredArticle>;
    const article = value.article as Partial<PracticeArticle> | undefined;

    if (
      typeof value.tabId !== "string" ||
      value.tabId !== getTabId() ||
      !article ||
      typeof article.id !== "string" ||
      typeof article.title !== "string" ||
      typeof article.text !== "string" ||
      typeof article.createdAt !== "string"
    ) {
      throw new Error("Invalid or foreign-tab article");
    }

    return article as PracticeArticle;
  } catch {
    sessionStorage.removeItem(CURRENT_ARTICLE_KEY);
    return null;
  }
}
