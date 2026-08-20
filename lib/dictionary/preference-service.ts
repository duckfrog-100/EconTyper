import type {
  CandidatePreference,
  CustomMeaningPreference,
  UserDictionaryPreference,
} from "@/types/dictionary-preference";
import {
  getDictionaryPreference,
  saveCandidatePreference as saveCandidate,
  saveCustomMeaningPreference as saveCustom,
  removeDictionaryPreference as removePreference,
  loadDictionaryPreferences,
  restoreDictionaryPreference,
} from "@/lib/dictionary/preferences";

/**
 * Preference 저장소 접근을 캡슐화하는 서비스 계층.
 *
 * UI 컴포넌트는 이 서비스를 통해만 preference에 접근한다.
 * 향후 localStorage → IndexedDB/SQLite/Cloud Sync로 교체해도 UI는 수정하지 않는다.
 */
export const preferenceService = {
  /** 단어에 대한 저장된 preference를 조회한다. (candidate | custom) */
  get(word: string): UserDictionaryPreference | undefined {
    return getDictionaryPreference(word);
  },

  /** Dictionary Candidate를 기본 뜻으로 저장한다. */
  saveCandidate(word: string, candidateKey: string): CandidatePreference | null {
    return saveCandidate(word, candidateKey);
  },

  /** 사용자 직접 입력 뜻을 기본 뜻으로 저장한다. */
  saveCustomMeaning(word: string, customMeaning: string): CustomMeaningPreference | null {
    return saveCustom(word, customMeaning);
  },

  /** 기존 candidateKey 기반 저장 (하위 호환 wrapper). */
  save(word: string, candidateKey: string): CandidatePreference | null {
    return saveCandidate(word, candidateKey);
  },

  /**
   * 이전 Preference를 복원한다.
   * previousPreference가 null이면 해당 단어의 Preference 삭제.
   * 성공 시 true, 실패 시 false.
   */
  restore(word: string, previousPreference: UserDictionaryPreference | null): boolean {
    return restoreDictionaryPreference(word, previousPreference);
  },

  /** 단어에 대한 preference를 삭제한다. */
  remove(word: string): boolean {
    return removePreference(word);
  },

  /** 모든 preference를 불러온다. */
  loadAll(): Record<string, UserDictionaryPreference> {
    return loadDictionaryPreferences();
  },
};