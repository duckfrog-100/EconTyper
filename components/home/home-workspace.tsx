"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { extractArticle } from "@/app/actions/extract-article";
import { HistorySummary } from "@/components/history/history-summary";
import { RecentHistory } from "@/components/history/recent-history";
import { getHomeExperienceMode } from "@/lib/home-experience";
import { calculatePracticeHistorySummary, readPracticeHistory } from "@/lib/history-storage";
import { recommendedReadingSites } from "@/lib/recommended-reading-sites";
import { saveCurrentArticle } from "@/lib/session-storage";
import { starterLibrary } from "@/lib/starter-library";
import { readSavedWords } from "@/lib/vocabulary-storage";
import type { PracticeArticle } from "@/types/article";
import type { PracticeHistoryEntry } from "@/types/history";

function startPractice(article: PracticeArticle, push: (href: string) => void) {
  saveCurrentArticle(article);
  push(`/practice?session=${encodeURIComponent(article.id)}`);
}

function normalizePastedText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/[ \t\n]+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

export function HomeWorkspace() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [error, setError] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [history, setHistory] = useState<PracticeHistoryEntry[]>([]);
  const [savedWordCount, setSavedWordCount] = useState(0);
  const [showMoreStarter, setShowMoreStarter] = useState(false);
  const [showMoreSites, setShowMoreSites] = useState(false);

  useEffect(() => {
    setHistory(readPracticeHistory());
    setSavedWordCount(readSavedWords().length);
  }, []);

  const historySummary = useMemo(
    () => calculatePracticeHistorySummary(history, savedWordCount),
    [history, savedWordCount],
  );

  const experienceMode = getHomeExperienceMode(history.length, savedWordCount);
  const isFirstVisit = experienceMode === "first-visit";

  async function handleExtract() {
    setError("");
    setIsExtracting(true);
    try {
      const result = await extractArticle(url);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      startPractice(result.article, router.push);
    } finally {
      setIsExtracting(false);
    }
  }

  function handlePaste() {
    setError("");
    const text = normalizePastedText(pasteText);
    if (text.length < 80) {
      setError("연습을 시작하려면 80자 이상의 영어 글을 붙여 넣어 주세요.");
      return;
    }

    const article: PracticeArticle = {
      id: crypto.randomUUID(),
      title: pasteTitle.trim() || "직접 붙여 넣은 글",
      sourceName: "직접 입력",
      text,
      createdAt: new Date().toISOString(),
    };

    startPractice(article, router.push);
  }

  const visibleStarter = showMoreStarter ? starterLibrary : starterLibrary.slice(0, 3);
  const visibleSites = showMoreSites ? recommendedReadingSites : recommendedReadingSites.slice(0, 3);

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
      <header className="mb-8 max-w-2xl">
        <p className="text-sm font-semibold tracking-[0.18em] text-emerald-600 dark:text-emerald-400">영어필사차곡차곡</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl">오늘도 한 문장부터 시작해 볼까요?</h1>
        <p className="mt-3 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">영어 글을 가져오거나 직접 붙여 넣어 필사를 시작하세요.</p>
      </header>

      <section id="practice-start" className="mb-8 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 sm:mb-10">
        <div className="p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">필사 시작</p>
          <div className="mt-4 space-y-4">
            <div>
              <label className="sr-only" htmlFor="article-url">영어 글 URL</label>
              <input id="article-url" type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="기사 URL을 입력하세요 (https://...)" className="w-full rounded-xl border border-zinc-300 bg-transparent px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-700" />
              <button type="button" onClick={handleExtract} disabled={!url.trim() || isExtracting} className="mt-3 min-h-11 w-full rounded-xl bg-zinc-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white">{isExtracting ? "글을 가져오는 중…" : "글 가져오기"}</button>
            </div>
            <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <p className="mb-3 text-[11px] text-zinc-400 dark:text-zinc-500">또는 직접 텍스트 붙여넣기</p>
              <input value={pasteTitle} onChange={(event) => setPasteTitle(event.target.value)} placeholder="제목 입력(선택)" className="mb-3 w-full rounded-xl border border-zinc-300 bg-transparent px-4 py-3 text-sm outline-none focus:border-emerald-500 dark:border-zinc-700" />
              <textarea value={pasteText} onChange={(event) => setPasteText(event.target.value)} placeholder="필사하고 싶은 영어 글을 붙여 넣어 주세요." rows={4} className="w-full resize-none rounded-xl border border-zinc-300 bg-transparent px-4 py-3 text-sm outline-none focus:border-emerald-500 dark:border-zinc-700" />
              <div className="mt-3 flex items-center justify-between gap-4"><span className="text-xs text-zinc-500">{pasteText.length.toLocaleString()}자</span><button type="button" onClick={handlePaste} disabled={pasteText.trim().length < 80} className="min-h-11 rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-40 dark:border-zinc-700">필사 시작</button></div>
            </div>
          </div>
        </div>
      </section>

      {error && <p role="alert" className="mb-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

      {isFirstVisit && (
        <section aria-label="사용 방법" className="mb-8 grid gap-3 sm:grid-cols-3 sm:mb-10">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">1단계</span>
            <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">영어 글을 가져오세요</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">기사 URL을 가져오거나 텍스트를 붙여 넣으세요.</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">2단계</span>
            <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">문장을 따라 입력하세요</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">문장별로 필사하며 틀린 글자는 바로 확인할 수 있어요.</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">3단계</span>
            <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">단어를 저장하고 복습하세요</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">단어장에 쌓고 복습과 게임으로 이어가세요.</p>
          </div>
        </section>
      )}

      {!isFirstVisit && (
        <section aria-labelledby="learning-summary-title" className="mb-8 sm:mb-10">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">나의 학습</p>
            <h2 id="learning-summary-title" className="mt-1 text-lg font-semibold">조금씩 쌓이는 영어 습관</h2>
          </div>
          <HistorySummary summary={historySummary} compact />
          <RecentHistory entries={history} />
          <div className="mt-4 flex flex-wrap gap-4">
            <Link href="/vocabulary" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300">내 단어장 보기 →</Link>
            <Link href="/review" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300">복습 시작 →</Link>
          </div>
        </section>
      )}

      <section className="mb-8 sm:mb-10">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">부가 학습</p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-950 dark:text-zinc-50">타자 속도 게임</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">30초·60초·120초 동안 영어 문장을 빠르게 입력해 보세요.</p>
        </div>
        <Link href="/game" className="inline-flex min-h-11 items-center rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">게임 시작 →</Link>
      </section>

      <section className="mb-8 sm:mb-10">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">추천 영어 지문</p>
          <h2 className="mt-1 text-lg font-semibold">바로 시작하는 짧은 필사</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleStarter.map((article) => (
            <article key={article.id} className="flex min-h-44 flex-col rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between text-[11px] text-zinc-500"><span>{article.topic}</span><span>약 {article.minutes}분</span></div>
              <h3 className="mt-3 text-sm font-semibold leading-snug">{article.title}</h3>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{article.text}</p>
              <button type="button" onClick={() => startPractice({ ...article, createdAt: new Date().toISOString() }, router.push)} className="mt-auto pt-4 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-400">필사하기 →</button>
            </article>
          ))}
        </div>
        {starterLibrary.length > 3 && (
          <button type="button" onClick={() => setShowMoreStarter((p) => !p)} className="mt-3 text-xs font-semibold text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50">{showMoreStarter ? "접기" : `더 보기 (${starterLibrary.length - 3}개)`}</button>
        )}
      </section>

      <section className="mb-8 sm:mb-10">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">추천 읽기 사이트</p>
          <h2 className="mt-1 text-lg font-semibold">필사할 영어 글 찾기</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleSites.map((site) => (
            <article key={site.id} className="flex flex-col rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-[11px] text-zinc-500">{site.category}</p>
              <h3 className="mt-3 text-sm font-semibold leading-snug">{site.name}</h3>
              <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{site.description}</p>
              <a href={site.url} target="_blank" rel="noopener noreferrer" className="mt-auto flex min-h-11 items-center pt-4 text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300">
                {site.name} 방문하기 →<span className="sr-only">(새 탭에서 열림)</span>
              </a>
            </article>
          ))}
        </div>
        {recommendedReadingSites.length > 3 && (
          <button type="button" onClick={() => setShowMoreSites((p) => !p)} className="mt-3 text-xs font-semibold text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50">{showMoreSites ? "접기" : `더 보기 (${recommendedReadingSites.length - 3}개)`}</button>
        )}
      </section>

      <footer className="border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">영어필사차곡차곡</p>
        <p className="mt-3 max-w-xl text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          연습 중인 글은 현재 브라우저 탭에 임시 저장되고, 단어장·복습·학습 기록은 이 브라우저에 저장됩니다. 브라우저 데이터를 삭제하면 복구할 수 없습니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-4">
          <Link href="/privacy" className="flex min-h-11 items-center text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50">개인정보처리방침</Link>
          <Link href="/terms" className="flex min-h-11 items-center text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50">이용약관</Link>
        </div>
      </footer>
    </main>
  );
}