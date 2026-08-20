import type { UserDictionaryPreference } from "@/types/dictionary-preference";
import type { SavedWord } from "@/types/vocabulary";
import { validateSavedWordMeaning } from "@/lib/vocabulary-view";
import { updateSavedWordMeaning, writeSavedWords } from "@/lib/vocabulary-storage";
import { preferenceService } from "@/lib/dictionary/preference-service";

export type SaveCustomMeaningResult =
  | {
      ok: true;
      words: SavedWord[];
      preference?: UserDictionaryPreference;
    }
  | {
      ok: false;
      reason: "validation" | "preference-save-failed" | "snapshot-save-failed" | "rollback-failed";
      snapshotSaved: boolean;
      preferenceSaved: boolean;
      rollbackSucceeded?: boolean;
      message: string;
    };

type SaveSavedWordInput = {
  words: SavedWord[];
  savedWordId: string;
  meaning: string;
  useAsDefault: boolean;
  now: number;
};

/**
 * SavedWord snapshot meaning 수정과 Dictionary Preference 저장을 함께 처리한다.
 *
 * 처리 순서 (원자성 보장을 위한 순서):
 * 1. validation
 * 2. 기존 Preference 조회 및 보관
 * 3. useAsDefault가 true면 custom Preference 저장
 * 4. Preference 저장 실패 시 Snapshot 저장을 시작하지 않음
 * 5. Snapshot 수정 및 SavedWord v2 저장
 * 6. Snapshot 저장 실패 시 이전 Preference 복원 시도
 *    - 이전 Preference가 없었다면 새 Preference 삭제
 *    - 이전 Preference가 있었다면 정확히 이전 객체를 복원
 * 7. 롤백 실패 여부도 결과에 포함
 *
 * useAsDefault=false인 경우 Preference 저장·롤백을 수행하지 않는다.
 */
export function saveSavedWordMeaningWithPreference({
  words,
  savedWordId,
  meaning,
  useAsDefault,
  now,
}: SaveSavedWordInput): SaveCustomMeaningResult {
  // 1. validation
  const { trimmedValue, error } = validateSavedWordMeaning(meaning);
  if (error) {
    return {
      ok: false,
      reason: "validation",
      snapshotSaved: false,
      preferenceSaved: false,
      message: error,
    };
  }

  // 대상 단어 확인
  const target = words.find((w) => w.id === savedWordId);
  if (!target) {
    return {
      ok: false,
      reason: "validation",
      snapshotSaved: false,
      preferenceSaved: false,
      message: "대상 단어를 찾을 수 없습니다.",
    };
  }

  const normalizedWord = target.normalizedWord || target.word;

  // 2. 기존 Preference 조회 및 보관
  const previousPreference = useAsDefault
    ? preferenceService.get(normalizedWord) ?? null
    : null;

  // 3. useAsDefault가 true면 custom Preference 저장
  let savedPreference: UserDictionaryPreference | undefined;
  if (useAsDefault) {
    const pref = preferenceService.saveCustomMeaning(normalizedWord, trimmedValue);
    if (!pref) {
      // 4. Preference 저장 실패 시 Snapshot 저장 시작하지 않음
      return {
        ok: false,
        reason: "preference-save-failed",
        snapshotSaved: false,
        preferenceSaved: false,
        message: "기본 뜻 저장에 실패했습니다.",
      };
    }
    savedPreference = pref;
  }

  // 5. Snapshot 수정 및 SavedWord v2 저장
  const nextWords = updateSavedWordMeaning(words, savedWordId, trimmedValue, now);
  const snapshotOk = writeSavedWords(nextWords);

  if (!snapshotOk) {
    // 6. Snapshot 저장 실패 시 이전 Preference 복원 시도
    if (useAsDefault) {
      const rollbackSucceeded = preferenceService.restore(normalizedWord, previousPreference);
      return {
        ok: false,
        reason: rollbackSucceeded ? "snapshot-save-failed" : "rollback-failed",
        snapshotSaved: false,
        preferenceSaved: true,
        rollbackSucceeded,
        message: rollbackSucceeded
          ? "뜻 저장에 실패했습니다."
          : "저장 일부가 반영되어 이전 설정 복구에 실패했습니다.",
      };
    }

    // useAsDefault=false: Preference 롤백 불필요
    return {
      ok: false,
      reason: "snapshot-save-failed",
      snapshotSaved: false,
      preferenceSaved: false,
      message: "뜻 저장에 실패했습니다.",
    };
  }

  // 7. 모두 성공
  return {
    ok: true,
    words: nextWords,
    preference: savedPreference,
  };
}