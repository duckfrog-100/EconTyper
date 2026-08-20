export type CandidatePreference = {
  kind: "candidate";
  normalizedWord: string;
  candidateKey: string;
  selectedAt: string;
};

export type CustomMeaningPreference = {
  kind: "custom";
  normalizedWord: string;
  customMeaning: string;
  selectedAt: string;
};

export type UserDictionaryPreference =
  | CandidatePreference
  | CustomMeaningPreference;

export type DictionaryPreferenceStoreV2 = {
  version: 2;
  items: Record<string, UserDictionaryPreference>;
};

export type LegacyDictionaryPreference = {
  normalizedWord: string;
  candidateKey: string;
  selectedAt: string;
};