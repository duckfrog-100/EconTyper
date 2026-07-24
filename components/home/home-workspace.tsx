"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { extractArticle } from "@/app/actions/extract-article";
import { saveCurrentArticle } from "@/lib/session-storage";
import { starterLibrary } from "@/lib/starter-library";
import type { PracticeArticle } from "@/types/article";

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

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
      <header className="mb-12 max-w-2xl">
        <p className="mb-3 text-sm font-semibold tracking-[0.18em] text-emerald-600 dark:text-emerald-400">영어필사 차곡차곡</p>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-6xl">영어를 한 문장씩,<br />실력을 차곡차곡.</h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400">뉴스, 에세이, 업무 문서 등 원하는 영어 글을 가져와 문장별로 필사하고 한국어 해석과 단어 뜻을 확인해 보세요. 연습 내용은 현재 브라우저 탭에만 유지됩니다.</p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">URL에서 가져오기</p><h2 className="mt-2 text-xl font-semibold">영어 글 가져오기</h2></div>
          <label className="sr-only" htmlFor="article-url">영어 글 URL</label>
          <input id="article-url" type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/article" className="w-full rounded-2xl border border-zinc-300 bg-transparent px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-700" />
          <button type="button" onClick={handleExtract} disabled={!url.trim() || isExtracting} className="mt-4 w-full rounded-2xl bg-zinc-950 px-4 py-3 font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white">{isExtracting ? "글을 가져오는 중…" : "글 가져오기"}</button>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">직접 입력</p><h2 className="mt-2 text-xl font-semibold">영어 텍스트 붙여 넣기</h2></div>
          <input value={pasteTitle} onChange={(event) => setPasteTitle(event.target.value)} placeholder="제목 입력(선택)" className="mb-3 w-full rounded-2xl border border-zinc-300 bg-transparent px-4 py-3 outline-none focus:border-emerald-500 dark:border-zinc-700" />
          <textarea value={pasteText} onChange={(event) => setPasteText(event.target.value)} placeholder="필사하고 싶은 영어 글을 붙여 넣어 주세요." rows={6} className="w-full resize-none rounded-2xl border border-zinc-300 bg-transparent px-4 py-3 outline-none focus:border-emerald-500 dark:border-zinc-700" />
          <div className="mt-3 flex items-center justify-between gap-4"><span className="text-sm text-zinc-500">{pasteText.length.toLocaleString()}자</span><button type="button" onClick={handlePaste} disabled={pasteText.trim().length < 80} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-40 dark:border-zinc-700">필사 시작</button></div>
        </div>
      </section>

      {error && <p role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

      <section className="mt-16">
        <div className="mb-6"><p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">추천 영어 지문</p><h2 className="mt-2 text-2xl font-semibold">바로 시작하는 짧은 필사</h2></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {starterLibrary.map((article) => (
            <article key={article.id} className="flex min-h-52 flex-col rounded-3xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between text-xs text-zinc-500"><span>{article.topic}</span><span>약 {article.minutes}분</span></div>
              <h3 className="mt-4 text-lg font-semibold">{article.title}</h3>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{article.text}</p>
              <button type="button" onClick={() => startPractice({ ...article, createdAt: new Date().toISOString() }, router.push)} className="mt-auto pt-5 text-left text-sm font-semibold text-emerald-700 dark:text-emerald-400">필사하기 →</button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
