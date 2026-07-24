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

export function useSpeechSynthesis() {
  const [supported, setSupported] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const endCallbackRef = useRef<(() => void) | undefined>(undefined);

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
      window.speechSynthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    endCallbackRef.current = undefined;
    setSpeakingIndex(null);
  }, []);

  const speak = useCallback(({ index, text, locale, rate, onEnd }: SpeakOptions) => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const languageVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith(locale.toLowerCase()));
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
  }, [voices]);

  return { supported, speakingIndex, speak, stop };
}
