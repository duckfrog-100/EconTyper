import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-8 sm:py-16">
      <p className="text-sm font-semibold tracking-[0.18em] text-emerald-600 dark:text-emerald-400">영어필사차곡차곡</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl">이용약관</h1>
      <p className="mt-4 text-sm text-zinc-500">시행일: 2026년 8월 3일 (초기 MVP 안내문)</p>

      <div className="mt-8 space-y-6 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
        <section>
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">1. 서비스 성격</h2>
          <p className="mt-2">이 서비스는 영어 학습을 위한 무료 참고 도구입니다. 실제 법률·재무·의료 전문 조언을 대신하지 않습니다.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">2. 콘텐츠 저작권</h2>
          <p className="mt-2">
            사용자가 URL로 가져온 글의 저작권은 원문 제공자에게 있습니다. 사용자는 가져온 콘텐츠를 적법한 목적(개인 학습)으로만 이용할 책임이 있습니다.
            복사본을 재배포하거나 상업적으로 이용하는 것은 권장되지 않습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">3. 서비스 제공</h2>
          <p className="mt-2">이 서비스는 중단 없이 제공되는 것을 보장하지 않습니다. 점검, 오류, 네트워크 문제로 일시적으로 이용이 어려울 수 있습니다.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">4. 데이터 보존</h2>
          <p className="mt-2">
            학습 데이터는 브라우저 로컬 저장소에만 보관되며, 브라우저 데이터 삭제 시 복구되지 않습니다. 중요한 데이터는 별도로 백업해 주세요.
          </p>
        </section>
      </div>

      <Link href="/" className="mt-10 inline-block rounded-xl border border-zinc-300 px-5 py-3 text-sm font-medium dark:border-zinc-700">← 홈으로</Link>
    </main>
  );
}