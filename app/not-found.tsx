import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-5 py-16 text-center">
      <p className="text-sm font-semibold tracking-[0.18em] text-emerald-600 dark:text-emerald-400">영어필사차곡차곡</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">페이지를 찾을 수 없습니다.</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">요청하신 주소가 변경되었거나 존재하지 않습니다. 홈으로 이동해 다시 시도해 주세요.</p>
      <Link href="/" className="mt-8 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-950">
        홈으로 이동
      </Link>
    </main>
  );
}