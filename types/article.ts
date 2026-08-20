export type PracticeArticle = {
  id: string;
  title: string;
  sourceUrl?: string;
  sourceName?: string;
  text: string;
  excerpt?: string;
  byline?: string;
  createdAt: string;
};

export type ExtractArticleResult =
  | { ok: true; article: PracticeArticle }
  | { ok: false; message: string };
