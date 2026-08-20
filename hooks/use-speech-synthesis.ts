"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechLocale = "en-US" | "en-GB";

type SpeakOptions = {
  index: number;
  text: string;
  locale: SpeechLocale;
  rate: number;
  onEnd?: () => void;
};

/**
 * cancel()과 speak() 사이에 필요한 지연 (밀리초).
 *
 * Chromium/Windows bug: speechSynthesis.cancel()은 비동기적으로 처리된다.
 * cancel() 직후 같은 JavaScript tick에서 speak()를 호출하면
 * 이전 음성이 완전히 정리되기 전에 새 음성이 시작되어
 * 첫 음소(첫 단어)가 작게 나오거나 잘린다.
 *
 * 50ms는 cancel 완료(보통 10-30ms)에 충분한 margin이며,
 * 사람이 인지할 수 있는 지연(>100ms)보다 작아 체감 품질에 영향을 주지 않는다.
 */
const POST_CANCEL_DELAY_MS = 50;

export function useSpeechSynthesis() {
  const [supported, setSupported] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const endCallbackRef = useRef<(() => void) | undefined>(undefined);
  const pendingPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setSupported(false);
      return;
    }

    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      if (pendingPlayTimerRef.current !== null) {
        clearTimeout(pendingPlayTimerRef.current);
        pendingPlayTimerRef.current = null;
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  /** 모든 재생 중단: 즉시 취소 + 예약된 재생 취소 */
  const stop = useCallback(() => {
    if (pendingPlayTimerRef.current !== null) {
      clearTimeout(pendingPlayTimerRef.current);
      pendingPlayTimerRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    endCallbackRef.current = undefined;
    setSpeakingIndex(null);
  }, []);

  /**
   * 새 문장 재생을 예약한다.
   *
   * cancel()과 speak() 사이에 POST_CANCEL_DELAY_MS 지연을 두어
   * Chromium 첫 단어 잘림 문제를 완화한다.
   *
   * 이미 예약된 재생이 있으면 취소하고 새 요청으로 대체한다.
   */
  const speak = useCallback(({ index, text, locale, rate, onEnd }: SpeakOptions) => {
    if (!("speechSynthesis" in window)) return;

    // 이전 예약 취소
    if (pendingPlayTimerRef.current !== null) {
      clearTimeout(pendingPlayTimerRef.current);
      pendingPlayTimerRef.current = null;
    }

    pendingPlayTimerRef.current = setTimeout(() => {
      pendingPlayTimerRef.current = null;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const languageVoices = voices.filter((voice) =>
        voice.lang.toLowerCase().startsWith(locale.toLowerCase()),
      );
      utterance.voice = languageVoices.find((voice) => voice.default) ?? languageVoices[0] ?? null;
      utterance.lang = locale;
      utterance.rate = rate;
      utterance.pitch = 1;
      endCallbackRef.current = onEnd;

      utterance.onstart = () => setSpeakingIndex(index);
      utterance.onend = () => {
        setSpeakingIndex(null);
        const callback = endCallbackRef.current;
        endCallbackRef.current = undefined;
        callback?.();
      };
      utterance.onerror = () => {
        setSpeakingIndex(null);
        endCallbackRef.current = undefined;
      };

      window.speechSynthesis.speak(utterance);
    }, POST_CANCEL_DELAY_MS);
  }, [voices]);

  return { supported, speakingIndex, speak, stop };
}