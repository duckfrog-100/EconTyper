export const GAME_PROMPTS: string[] = [
  "Clear communication helps teams solve problems faster.",
  "Small daily habits can create meaningful long-term change.",
  "Technology should make difficult tasks easier to understand.",
  "Reading a little every day builds a strong foundation for learning.",
  "A clear goal makes it easier to stay focused on what matters.",
  "Good questions often lead to better answers than quick guesses.",
  "Simple instructions help people follow new processes with confidence.",
  "Practice turns unfamiliar skills into natural habits over time.",
  "Listening carefully is one of the most useful skills in any workplace.",
  "Successful projects usually begin with a shared understanding of the problem.",
  "Planning ahead saves time and reduces unnecessary stress later.",
  "Feedback is most helpful when it is specific and easy to act on.",
  "A calm approach to challenges often produces better decisions.",
  "Learning from mistakes is a faster path to improvement than avoiding them.",
  "Reliable tools make routine work more predictable and efficient.",
  "Good writing respects the reader's time and attention.",
  "Consistent effort matters more than occasional bursts of activity.",
  "Meetings work best when everyone knows the purpose and the expected outcome.",
  "Technology connects people across distances and time zones.",
  "A short break can refresh your mind and improve your next hour of work.",
  "Clear deadlines help teams prioritize what needs to happen first.",
  "Automation handles repetitive tasks so people can focus on creative work.",
  "An organized workspace can reduce distractions and boost productivity.",
  "Explaining an idea in simple words shows a deeper understanding.",
  "Small improvements made regularly add up to impressive results.",
  "Data helps teams make decisions based on evidence instead of guesses.",
  "A useful summary saves readers from searching through long reports.",
  "Curiosity keeps learning interesting even after many years of practice.",
  "Strong passwords and regular backups protect important information.",
  "Asking for help early is better than struggling silently for hours.",
  "A friendly tone makes even negative feedback easier to accept.",
  "Time spent reviewing your work is never wasted.",
  "New technology is easier to adopt when training is clear and practical.",
  "A focused mind produces better work than a busy but scattered one.",
  "Emergency plans are important even for tasks that rarely fail.",
  "Writing down ideas helps turn vague thoughts into actionable plans.",
  "A good routine reduces the number of small decisions you make each day.",
  "Remote teams succeed when they communicate clearly and often.",
  "Sharp tools and clean data make analysis faster and more reliable.",
  "A patient approach to troubleshooting usually finds the real cause.",
  "Short summaries at the end of a meeting help everyone remember next steps.",
  "Learning basic keyboard shortcuts can save hours over a long period.",
  "An open mind welcomes ideas that do not match your first assumption.",
  "Clear labels prevent confusion when several people share one workspace.",
  "A well-written email states the request and the deadline up front.",
  "Regular exercise improves both physical health and mental focus.",
  "Digital documents are easy to store, search, and share with others.",
  "A simple checklist catches small mistakes before they become big ones.",
  "Choosing the right words makes instructions easier to follow.",
  "Building trust takes time but strong teams depend on it.",
  "A positive attitude helps you recover quickly from setbacks.",
  "Protecting your attention is just as important as protecting your data.",
  "Memory improves when you review new information after a short delay.",
  "An effective leader listens more than they speak.",
  "Small experiments reveal what works better than endless discussion.",
  "Clear ownership of tasks prevents critical work from being forgotten.",
  "A healthy balance between work and rest keeps your energy steady.",
  "Searching for the right term can be faster than browsing entire documents.",
  "Good documentation answers common questions without interrupting others.",
  "A quiet environment helps deep work happen more efficiently.",
];

export function selectGamePrompts(
  prompts: string[],
  count: number,
  random: () => number = Math.random,
): string[] {
  if (prompts.length === 0 || count <= 0) return [];

  // count <= length: 가능한 한 중복 없이 선택
  if (count <= prompts.length) {
    const pool = [...prompts];
    const result: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const pickIndex = Math.min(pool.length - 1, Math.floor(random() * pool.length));
      result.push(pool[pickIndex]);
      pool.splice(pickIndex, 1);
    }
    return result;
  }

  // count > length: 반복 허용 (안전하게 count만큼 채움)
  const result: string[] = [];
  for (let index = 0; index < count; index += 1) {
    result.push(prompts[Math.min(prompts.length - 1, Math.floor(random() * prompts.length))]);
  }
  return result;
}

/**
 * 현재 큐 뒤에 새 프롬프트 묶음을 이어 붙인다.
 * - currentQueue와 sourcePrompts를 mutate하지 않는다.
 * - 직전 문장(마지막 원소)과 새 batch 첫 문장이 같으면 가능한 범위에서 순서를 조정한다.
 * - sourcePrompts가 비어 있으면 기존 queue를 그대로 반환한다.
 * - sourcePrompts가 1개뿐이면 반복을 허용한다.
 */
export function extendGamePromptQueue({
  currentQueue,
  sourcePrompts,
  batchSize,
  random = Math.random,
}: {
  currentQueue: string[];
  sourcePrompts: string[];
  batchSize: number;
  random?: () => number;
}): string[] {
  if (sourcePrompts.length === 0 || batchSize <= 0) return [...currentQueue];

  const previous = currentQueue[currentQueue.length - 1];
  const batch = selectGamePrompts(sourcePrompts, batchSize, random);

  if (previous !== undefined && batch.length > 0 && batch[0] === previous) {
    if (batch.length > 1) {
      // 두 번째 문장이 첫 문장과 같지 않게 앞 순서 조정
      const first = batch[0];
      batch[0] = batch[1];
      batch[1] = first;
    } else if (sourcePrompts.length > 1) {
      // batch가 1개뿐인 경우 source에서 다른 문장 선택 시도
      const alternatives = sourcePrompts.filter((prompt) => prompt !== previous);
      if (alternatives.length > 0) {
        const pickIndex = Math.min(alternatives.length - 1, Math.floor(random() * alternatives.length));
        batch[0] = alternatives[pickIndex];
      }
    }
  }

  return [...currentQueue, ...batch];
}