export type RecommendedReadingSite = {
  id: string;
  name: string;
  url: string;
  category: "쉬운 뉴스" | "경제·시사" | "깊이 있는 글" | "고전";
  description: string;
};

export const recommendedReadingSites: RecommendedReadingSite[] = [
  {
    id: "reuters",
    name: "Reuters",
    url: "https://www.reuters.com/",
    category: "경제·시사",
    description: "경제와 국제 뉴스 문장이 비교적 간결해 시사 영어 필사에 적합합니다.",
  },
  {
    id: "ap-news",
    name: "AP News",
    url: "https://apnews.com/",
    category: "경제·시사",
    description: "사실 중심의 문장 구조가 많아 뉴스 영어의 기본 문체를 연습하기 좋습니다.",
  },
  {
    id: "bbc-learning-english",
    name: "BBC Learning English",
    url: "https://www.bbc.co.uk/learningenglish/",
    category: "쉬운 뉴스",
    description: "영어 학습자를 위한 짧은 뉴스와 표현 설명을 함께 확인할 수 있습니다.",
  },
  {
    id: "voa-learning-english",
    name: "VOA Learning English",
    url: "https://learningenglish.voanews.com/",
    category: "쉬운 뉴스",
    description: "비교적 쉬운 어휘와 학습자용 음성으로 초급 필사와 듣기에 적합합니다.",
  },
  {
    id: "the-conversation",
    name: "The Conversation",
    url: "https://theconversation.com/",
    category: "깊이 있는 글",
    description: "전문가가 쓴 설명형 글이 많아 중급 이상의 긴 문장 필사에 좋습니다.",
  },
  {
    id: "project-gutenberg",
    name: "Project Gutenberg",
    url: "https://www.gutenberg.org/",
    category: "고전",
    description: "저작권이 만료된 영문 고전을 무료로 읽고 문학 문체를 필사할 수 있습니다.",
  },
];
