export type GameDurationSeconds = 30 | 60 | 120;

export type SpeedGameResult = {
  id: string;
  playedAt: number;
  durationSeconds: GameDurationSeconds;

  wpm: number;
  accuracy: number;
  score: number;

  maxCombo: number;

  totalTypedCharacters: number;
  correctCharacters: number;
  incorrectCharacters: number;

  completedPrompts: number;
};

export type SpeedGameStore = {
  version: 1;
  personalBests: {
    "30": SpeedGameResult | null;
    "60": SpeedGameResult | null;
    "120": SpeedGameResult | null;
  };
  recentResults: SpeedGameResult[];
};