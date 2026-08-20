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
  wordsPerMinute: number;
  elapsedSeconds: number;
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
  wordsPerMinute,
  elapsedSeconds,
}: BuildPracticeHistoryEntryInput): PracticeHistoryEntry {
  const sourceName = article.sourceName?.trim();

  const sourceUrl = article.sourceUrl?.trim();
  const sourceText = article.text.slice(0, 20000);

  return {
    id,
    articleId: article.id,
    title: article.title,
    ...(sourceName ? { sourceName } : {}),
    ...(sourceUrl ? { sourceUrl } : {}),
    ...(sourceText ? { sourceText } : {}),
    completedAt,
    accuracy,
    typedCharacters,
    wrongSentenceCount,
    sessionWordCount,
    savedWordCount,
    sentenceCount,
    wordsPerMinute,
    elapsedSeconds,
  };
}
