"use client";

import type { SpeechLocale } from "@/hooks/use-speech-synthesis";

export type TypingSettingsValue = {
  fontSize: number;
  fontWeight: number;
  fontFamily: "sans" | "serif";
  lineHeight: number;
  showTranslations: boolean;
  speechLocale: SpeechLocale;
  speechRate: number;
  dictationMode: boolean;
  autoPlayNext: boolean;
};

export const DEFAULT_TYPING_SETTINGS: TypingSettingsValue = {
  fontSize: 26,
  fontWeight: 500,
  fontFamily: "sans",
  lineHeight: 1.7,
  showTranslations: false,
  speechLocale: "en-US",
  speechRate: 1,
  dictationMode: false,
  autoPlayNext: false,
};

type Props = {
  open: boolean;
  value: TypingSettingsValue;
  onChange: (value: TypingSettingsValue) => void;
  onClose: () => void;
};

function Stepper({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return (
    <div className="border-t border-zinc-200 py-5 dark:border-zinc-800">
      <div className="mb-3 flex items-center justify-between text-xs font-semibold tracking-wider"><span>{label}</span><span>{value}</span></div>
      <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
        <button type="button" onClick={() => onChange(Math.max(min, value - step))} className="py-3 text-xl hover:bg-zinc-100 dark:hover:bg-zinc-800">−</button>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} className="border-l border-zinc-200 py-3 text-xl hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">+</button>
      </div>
    </div>
  );
}

function Toggle({ label, description, checked, onClick }: { label: string; description: string; checked: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
      </div>
      <button type="button" role="switch" aria-checked={checked} onClick={onClick} className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`} />
      </button>
    </div>
  );
}

export function TypingSettings({ open, value, onChange, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <aside className="h-full w-full max-w-sm overflow-y-auto bg-white p-6 shadow-2xl dark:bg-zinc-950">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onClose} aria-label="설정 닫기" className="rounded-lg border border-zinc-200 px-3 py-2 text-lg dark:border-zinc-800">×</button>
          <button type="button" onClick={() => onChange(DEFAULT_TYPING_SETTINGS)} className="text-xs font-semibold tracking-wider">초기화</button>
        </div>
        <h2 className="mt-10 text-lg font-semibold">필사 설정</h2>

        <div className="mt-7 divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          <Toggle label="전체 문장 해석 보기" description="모든 문장 카드에서 한국어 해석을 표시합니다." checked={value.showTranslations} onClick={() => onChange({ ...value, showTranslations: !value.showTranslations })} />
          <Toggle label="듣고 쓰기 모드" description="영어 원문을 가리고 음성만 들으며 입력합니다." checked={value.dictationMode} onClick={() => onChange({ ...value, dictationMode: !value.dictationMode })} />
          <Toggle label="다음 문장 자동 재생" description="문장을 정확히 입력하면 다음 문장을 자동으로 읽습니다." checked={value.autoPlayNext} onClick={() => onChange({ ...value, autoPlayNext: !value.autoPlayNext })} />
        </div>

        <div className="border-b border-zinc-200 py-5 dark:border-zinc-800">
          <p className="mb-3 text-xs font-semibold tracking-wider">영어 음성</p>
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
            {(["en-US", "en-GB"] as const).map((locale) => (
              <button key={locale} type="button" onClick={() => onChange({ ...value, speechLocale: locale })} className={`px-3 py-3 text-sm ${value.speechLocale === locale ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950" : ""}`}>
                {locale === "en-US" ? "미국 영어" : "영국 영어"}
              </button>
            ))}
          </div>
        </div>

        <div className="border-b border-zinc-200 py-5 dark:border-zinc-800">
          <p className="mb-3 text-xs font-semibold tracking-wider">재생 속도</p>
          <div className="grid grid-cols-4 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
            {[0.7, 0.9, 1, 1.2].map((rate, index) => (
              <button key={rate} type="button" onClick={() => onChange({ ...value, speechRate: rate })} className={`px-2 py-3 text-sm ${index > 0 ? "border-l border-zinc-200 dark:border-zinc-700" : ""} ${value.speechRate === rate ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950" : ""}`}>
                {rate.toFixed(1)}×
              </button>
            ))}
          </div>
        </div>

        <Stepper label="글자 크기" value={value.fontSize} min={18} max={36} step={1} onChange={(fontSize) => onChange({ ...value, fontSize })} />
        <Stepper label="글자 굵기" value={value.fontWeight} min={300} max={700} step={100} onChange={(fontWeight) => onChange({ ...value, fontWeight })} />
        <Stepper label="줄 간격 × 10" value={Math.round(value.lineHeight * 10)} min={13} max={22} step={1} onChange={(lineHeight) => onChange({ ...value, lineHeight: lineHeight / 10 })} />

        <div className="border-t border-zinc-200 py-5 dark:border-zinc-800">
          <p className="mb-3 text-xs font-semibold tracking-wider">폰트</p>
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
            <button type="button" onClick={() => onChange({ ...value, fontFamily: "serif" })} className={`px-3 py-3 font-serif ${value.fontFamily === "serif" ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950" : ""}`}>명조 계열</button>
            <button type="button" onClick={() => onChange({ ...value, fontFamily: "sans" })} className={`px-3 py-3 ${value.fontFamily === "sans" ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950" : ""}`}>고딕 계열</button>
          </div>
        </div>

        <p className="mt-6 text-xs leading-5 text-zinc-500">TTS는 브라우저와 운영체제에 설치된 무료 영어 음성을 사용합니다. 기기마다 음성 종류와 품질이 다를 수 있습니다.</p>
      </aside>
    </div>
  );
}
