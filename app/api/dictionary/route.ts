import { NextResponse } from "next/server";
import { normalizeSentence } from "@/lib/dictionary/context";
import { lookupDictionary } from "@/lib/dictionary/service";
import type { DictionaryLookupContext } from "@/types/dictionary";

export const runtime = "nodejs";

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z'-]/g, "");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const word = normalizeWord(url.searchParams.get("word") ?? "");

  if (!word) {
    return NextResponse.json({ message: "올바른 영어 단어를 입력해 주세요." }, { status: 400 });
  }

  const context: DictionaryLookupContext = {
    word,
    sentence: normalizeSentence(url.searchParams.get("sentence") ?? undefined),
  };

  try {
    const response = await lookupDictionary(context);

    if (response.candidates.length === 0) {
      return NextResponse.json({ message: "단어 뜻을 찾지 못했습니다." }, { status: 404 });
    }

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "단어 조회 시간이 초과되었습니다."
      : "단어 뜻을 불러오지 못했습니다.";
    return NextResponse.json({ message }, { status: 502 });
  }
}