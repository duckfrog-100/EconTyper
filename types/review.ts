export type ReviewRating = "again" | "hard" | "good" | "easy";

export type SavedWordReviewState = {
  savedWordId: string;
  normalizedWord: string;

  reviewCount: number;
  correctCount: number;
  incorrectCount: number;

  intervalDays: number;

  lastReviewedAt?: number;
  nextReviewAt: number;

  createdAt: number;
  updatedAt: number;
};

export type ReviewStateStore = {
  version: 1;
  items: Record<string, SavedWordReviewState>;
};