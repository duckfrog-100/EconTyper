"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeWord, parseVocabularyCsv, toVocabularyCsv } from "@/lib/vocabulary-storage";
import type { SavedWord } from "@/types/vocabulary";

type VocabularyDrawerProps = {
  open: boolean;
  sessionWords: SavedWord[];
  savedWords: SavedWord[];
  onClose: () => void;
  onToggleSaved: (word: SavedWord) => void;
  onDeleteSessionWord: (word: SavedWord) => void;
  onClearSessionWords: () => void;
  onImportCsv: (words: SavedWord[]) => void;
};

function isSaved(word: SavedWord, savedWords: SavedWord[]): boolean {
  const normalized = normalizeWord(word.word);
  return savedWords.some((savedWord) => normalizeWord(savedWord.word) === normalized);
}

function downloadCsv(words: SavedWord[]): void {
  if (words.length === 0) return;
  const csv = `\uFEFF${toVocabularyCsv(words)}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `chagok-vocabulary-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function VocabularyDrawer({
  open,
  sessionWords,
  savedWords,
  onClose,
  onToggleSaved,
  onDeleteSessionWord,
  onClearSessionWords,
  onImportCsv,
}: VocabularyDrawerProps) {
  const [query, setQuery] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const filteredWords = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
    if (!normalizedQuery) return sessionWords;
    return sessionWords.filter((word) =>
      `${word.word} ${word.meaning} ${word.partOfSpeech ?? ""}`
        .toLocaleLowerCase("ko-KR")
        .includes(normalizedQuery),
    );
  }, [query, sessionWords]);

  async function handleImport(file: File | undefined) {
    if (!file) return;
    setImportMessage("");
    try {
      const imported = parseVocabularyCsv(await file.text());
      if (imported.length === 0) {
        setImportMessage("가져올 단어가 없습니다.");
        return;
      }
      onImportCsv(imported);
      setImportMessage(`${imported.length}개 단어를 내 단어에 가져왔습니다.`);
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "CSV 파일을 읽지 못했습니다.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleClear() {
    if (sessionWords.length === 0) return;
    if (window.confirm("이번 학습에서 확인한 단어를 모두 삭제할까요?")) {
      onClearSessionWords();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="vocabulary-title">
      <button type="button" aria-label="단어장 닫기" className="absolute inset-0 bg-zinc-950/45" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <header className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-5 dark:border-zinc-800">
          <div>
            <h2 id="vocabulary-title" className="text-xl font-semibold">오늘 학습한 단어</h2>
            <p className="mt-1 text-xs text-zinc-500">확인 {sessionWords.length}개 · 내 단어 {savedWords.length}개</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/vocabulary"
              onClick={onClose}
              className="rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
            >
              전체 단어장 보기
            </Link>
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">닫기</button>
          </div>
        </header>

        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <label htmlFor="vocabulary-search" className="sr-only">단어 검색</label>
          <input
            id="vocabulary-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="단어나 뜻 검색"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {filteredWords.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 px-5 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
              {sessionWords.length === 0 ? "★ 별표를 눌러 단어를 저장하면 이곳에 표시됩니다." : "검색 결과가 없습니다."}
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredWords.map((word) => {
                const saved = isSaved(word, savedWords);
                return (
                  <li key={normalizeWord(word.word)} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <strong className="block truncate text-base">{word.word}</strong>
                        <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{word.meaning}</p>
                        {word.exampleSentence && <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">{word.exampleSentence}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          aria-label={saved ? `${word.word} 내 단어에서 제거` : `${word.word} 내 단어로 저장`}
                          title={saved ? "내 단어에서 제거" : "내 단어로 저장"}
                          onClick={() => onToggleSaved(word)}
                          className={`rounded-lg px-2.5 py-2 text-lg ${saved ? "text-amber-500" : "text-zinc-400 hover:text-amber-500"}`}
                        >
                          {saved ? "★" : "☆"}
                        </button>
                        <button
                          type="button"
                          aria-label={`${word.word} 오늘 학습한 단어에서 삭제`}
                          title="이번 학습에서 삭제"
                          onClick={() => onDeleteSessionWord(word)}
                          className="rounded-lg px-2.5 py-2 text-sm text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="border-t border-zinc-200 px-5 py-5 dark:border-zinc-800">
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            내 단어는 현재 브라우저에만 보관됩니다. 브라우저 데이터를 삭제하거나 다른 기기를 사용하면 복구되지 않습니다.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" disabled={savedWords.length === 0} onClick={() => downloadCsv(savedWords)} className="rounded-xl border border-zinc-200 px-3 py-2.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800">내 단어 CSV 내보내기</button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-xl border border-zinc-200 px-3 py-2.5 text-xs font-semibold dark:border-zinc-800">CSV 가져오기</button>
            <button type="button" disabled={sessionWords.length === 0} onClick={handleClear} className="col-span-2 rounded-xl border border-red-200 px-3 py-2.5 text-xs font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900">이번 단어장 초기화</button>
          </div>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => void handleImport(event.target.files?.[0])} />
          {importMessage && <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400" role="status">{importMessage}</p>}
        </footer>
      </aside>
    </div>
  );
}
