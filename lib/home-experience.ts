export type HomeExperienceMode = "first-visit" | "returning";

/**
 * 홈 첫 방문 여부를 실제 학습 데이터 유무로 파생한다.
 * - 학습 기록이 없고 저장한 단어도 없으면 first-visit
 * - 그 외에는 returning
 * 입력값을 변경하지 않는다.
 */
export function getHomeExperienceMode(historyCount: number, savedWordCount: number): HomeExperienceMode {
  return historyCount === 0 && savedWordCount === 0 ? "first-visit" : "returning";
}