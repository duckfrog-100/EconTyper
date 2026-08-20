import { NextResponse } from "next/server";

export const runtime = "nodejs";

const TIMEOUT_MS = 8_000;
const MAX_TEXT_LENGTH = 700;

type TranslationResponse = {
  responseData?: {
    translatedText?: string;
  };
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "번역할 문장을 확인해 주세요." }, { status: 400 });
  }

  const text = normalizeText((body as { text?: unknown } | null)?.text);

  if (!text) {
    return NextResponse.json({ message: "번역할 문장을 입력해 주세요." }, { status: 400 });
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ message: "문장이 너무 길어 번역할 수 없습니다." }, { status: 413 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const query = new URLSearchParams({ q: text, langpair: "en|ko" });
    const response = await fetch(`https://api.mymemory.translated.net/get?${query.toString()}`, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return NextResponse.json({ message: "번역 서비스가 응답하지 않았습니다." }, { status: 502 });
    }

    const payload = (await response.json()) as TranslationResponse;
    const translatedText = payload.responseData?.translatedText?.trim();

    if (!translatedText || translatedText.toLowerCase() === text.toLowerCase()) {
      return NextResponse.json({ message: "한국어 번역을 찾지 못했습니다." }, { status: 404 });
    }

    return NextResponse.json({ translatedText });
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "문장 번역 시간이 초과되었습니다."
      : "문장 번역을 불러오지 못했습니다.";

    return NextResponse.json({ message }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
