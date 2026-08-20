import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-8 sm:py-16">
      <p className="text-sm font-semibold tracking-[0.18em] text-emerald-600 dark:text-emerald-400">영어필사차곡차곡</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl">개인정보처리방침</h1>
      <p className="mt-4 text-sm text-zinc-500">시행일: 2026년 8월 3일 (초기 MVP 안내문)</p>

      <div className="mt-8 space-y-6 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
        <section>
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">1. 수집하는 정보</h2>
          <p className="mt-2">
            이 서비스는 회원가입 없이 사용할 수 있습니다. 계정 정보, 이메일, 이름과 같은 개인 식별 정보를 서버에 수집·저장하지 않습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">2. 학습 기록 저장 방식</h2>
          <p className="mt-2">
            단어장(저장 단어), 복습 기록, 학습 기록(원문 포함), 타자 속도 게임 기록은 서버가 아닌 사용자 브라우저의 로컬 저장소(localStorage)에만 저장됩니다.
            필사 중인 글은 세션 저장소(sessionStorage)에 임시로 저장됩니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">3. 외부 API 호출</h2>
          <p className="mt-2">
            사전·번역 기능을 위해 외부 사전/번역 API가 호출될 수 있습니다. 이때 입력된 단어나 문장이 해당 서비스로 전달될 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">4. 데이터 삭제</h2>
          <p className="mt-2">
            브라우저의 사이트 데이터를 삭제하면 단어장·복습·게임 기록이 함께 삭제되며 복구할 수 없습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">5. 정책 변경</h2>
          <p className="mt-2">
            향후 분석(Analytics)이나 광고를 도입할 경우 본 방침을 업데이트하고 이 페이지에 반영합니다.
          </p>
        </section>
      </div>

      <Link href="/" className="mt-10 inline-block rounded-xl border border-zinc-300 px-5 py-3 text-sm font-medium dark:border-zinc-700">← 홈으로</Link>
    </main>
  );
}