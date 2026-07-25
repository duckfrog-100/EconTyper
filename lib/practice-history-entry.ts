import type { PracticeArticle } from "@/types/article";
import type { PracticeHistoryEntry } from "@/types/history";

type BuildPracticeHistoryEntryInput = {
  id: string;
  article: PracticeArticle;
  completedAt: string;
  accuracy: number;
  typedCharacters: number;
  wrongSentenceCount: number;
  sessionWordCount: number;
  savedWordCount: number;
  sentenceCount: number;
};

export function buildPracticeHistoryEntry({
  id,
  article,
  completedAt,
  accuracy,
  typedCharacters,
  wrongSentenceCount,
  sessionWordCount,
  savedWordCount,
  sentenceCount,
}: BuildPracticeHistoryEntryInput): PracticeHistoryEntry {
  const sourceName = article.sourceName?.trim();

  return {
    id,
    articleId: article.id,
    title: article.title,
    ...(sourceName ? { sourceName } : {}),
    completedAt,
    accuracy,
    typedCharacters,
    wrongSentenceCount,
    sessionWordCount,
    savedWordCount,
    sentenceCount,
  };
}
