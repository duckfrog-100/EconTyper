"use client";

export type TypingSettingsValue = {
  fontSize: number;
  fontWeight: number;
  fontFamily: "sans" | "serif";
  lineHeight: number;
  contextMode: "single" | "three";
};

export const DEFAULT_TYPING_SETTINGS: TypingSettingsValue = {
  fontSize: 26,
  fontWeight: 500,
  fontFamily: "sans",
  lineHeight: 1.7,
  contextMode: "single",
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
      <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wider"><span>{label}</span><span>{value}</span></div>
      <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
        <button type="button" onClick={() => onChange(Math.max(min, value - step))} className="py-3 text-xl hover:bg-zinc-100 dark:hover:bg-zinc-800">−</button>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} className="border-l border-zinc-200 py-3 text-xl hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">+</button>
      </div>
    </div>
  );
}

export function TypingSettings({ open, value, onChange, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <aside className="h-full w-full max-w-sm overflow-y-auto bg-white p-6 shadow-2xl dark:bg-zinc-950">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onClose} aria-label="Close settings" className="rounded-lg border border-zinc-200 px-3 py-2 text-lg dark:border-zinc-800">×</button>
          <button type="button" onClick={() => onChange(DEFAULT_TYPING_SETTINGS)} className="text-xs font-semibold uppercase tracking-wider">Reset</button>
        </div>
        <h2 className="mt-10 text-lg font-semibold">Typing Settings</h2>

        <div className="mt-7">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider">Display mode</p>
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
            {(["single", "three"] as const).map((mode) => (
              <button key={mode} type="button" onClick={() => onChange({ ...value, contextMode: mode })} className={`px-3 py-3 text-sm ${value.contextMode === mode ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950" : ""}`}>{mode === "single" ? "1 sentence" : "3 sentences"}</button>
            ))}
          </div>
        </div>

        <Stepper label="Font size" value={value.fontSize} min={18} max={36} step={1} onChange={(fontSize) => onChange({ ...value, fontSize })} />
        <Stepper label="Font weight" value={value.fontWeight} min={300} max={700} step={100} onChange={(fontWeight) => onChange({ ...value, fontWeight })} />
        <Stepper label="Line height × 10" value={Math.round(value.lineHeight * 10)} min={13} max={22} step={1} onChange={(lineHeight) => onChange({ ...value, lineHeight: lineHeight / 10 })} />

        <div className="border-t border-zinc-200 py-5 dark:border-zinc-800">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider">Font</p>
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
            <button type="button" onClick={() => onChange({ ...value, fontFamily: "serif" })} className={`px-3 py-3 font-serif ${value.fontFamily === "serif" ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950" : ""}`}>Serif</button>
            <button type="button" onClick={() => onChange({ ...value, fontFamily: "sans" })} className={`px-3 py-3 ${value.fontFamily === "sans" ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950" : ""}`}>Sans-serif</button>
          </div>
        </div>

        <p className="mt-6 text-xs leading-5 text-zinc-500">Capitalization, smart quotes, and special spaces are accepted automatically. Real spelling differences remain highlighted in red.</p>
      </aside>
    </div>
  );
}