"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // 콘솔에 로그만 남기고, 사용자에게 내부 오류 상세는 노출하지 않는다.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-5 py-16 text-center">
      <p className="text-sm font-semibold tracking-[0.18em] text-emerald-600 dark:text-emerald-400">영어필사차곡차곡</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">문제가 발생했습니다.</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">일시적인 오류가 발생했습니다. 다시 시도하거나 홈으로 이동해 주세요.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => reset()} className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white">
          다시 시도
        </button>
        <Link href="/" className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-medium dark:border-zinc-700">
          홈으로 이동
        </Link>
      </div>
    </main>
  );
}