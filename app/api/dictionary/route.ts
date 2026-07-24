import { NextResponse } from "next/server";

export const runtime = "nodejs";

const TIMEOUT_MS = 7_000;

type DictionaryEntry = {
  meanings?: Array<{
    partOfSpeech?: string;
    definitions?: Array<{ definition?: string }>;
  }>;
};

type TranslationResponse = {
  responseData?: { translatedText?: string };
};

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z'-]/g, "");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const word = normalizeWord(url.searchParams.get("word") ?? "");

  if (!word) {
    return NextResponse.json({ message: "올바른 영어 단어를 입력해 주세요." }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const dictionaryResponse = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: controller.signal, cache: "no-store" },
    );

    if (!dictionaryResponse.ok) {
      return NextResponse.json({ message: "단어 뜻을 찾지 못했습니다." }, { status: 404 });
    }

    const entries = (await dictionaryResponse.json()) as DictionaryEntry[];
    const definition = entries
      .flatMap((entry) => entry.meanings ?? [])
      .flatMap((meaning) => meaning.definitions ?? [])
      .find((item) => item.definition)?.definition?.trim();

    if (!definition) {
      return NextResponse.json({ message: "단어 뜻을 찾지 못했습니다." }, { status: 404 });
    }

    let korean: string | undefined;

    try {
      const query = new URLSearchParams({ q: definition.slice(0, 450), langpair: "en|ko" });
      const translationResponse = await fetch(`https://api.mymemory.translated.net/get?${query.toString()}`, {
        signal: controller.signal,
        cache: "no-store",
      });

      if (translationResponse.ok) {
        const payload = (await translationResponse.json()) as TranslationResponse;
        const translated = payload.responseData?.translatedText?.trim();
        if (translated && translated.toLowerCase() !== definition.toLowerCase()) korean = translated;
      }
    } catch {
      // 영어 정의는 그대로 반환한다.
    }

    return NextResponse.json({ word, english: definition, korean });
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "단어 조회 시간이 초과되었습니다."
      : "단어 뜻을 불러오지 못했습니다.";
    return NextResponse.json({ message }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
