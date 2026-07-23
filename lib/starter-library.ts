import type { PracticeArticle } from "@/types/article";

export type StarterArticle = Omit<PracticeArticle, "createdAt"> & {
  topic: string;
  minutes: number;
};

export const starterLibrary: StarterArticle[] = [
  {
    id: "starter-supply-demand",
    title: "Supply and Demand",
    topic: "Markets",
    minutes: 2,
    sourceName: "EconTyper Library",
    text: "Prices often emerge from the interaction between supply and demand. Demand describes how much consumers are willing and able to buy at different prices. Supply describes how much producers are willing and able to sell. When demand rises while supply stays unchanged, prices tend to increase. When supply expands faster than demand, prices tend to fall. The market price is not permanent. It changes as preferences, costs, technology, expectations, and available resources change.",
  },
  {
    id: "starter-inflation",
    title: "Inflation and Purchasing Power",
    topic: "Macroeconomics",
    minutes: 2,
    sourceName: "EconTyper Library",
    text: "Inflation is a sustained increase in the general price level. It reduces the purchasing power of money because the same amount of currency buys fewer goods and services over time. Moderate inflation may accompany economic growth, but rapid or unpredictable inflation makes planning difficult. Households reconsider spending, businesses face uncertain costs, and lenders demand compensation for the loss of purchasing power.",
  },
  {
    id: "starter-opportunity-cost",
    title: "Opportunity Cost",
    topic: "Decision Making",
    minutes: 2,
    sourceName: "EconTyper Library",
    text: "Every choice uses scarce resources. Opportunity cost is the value of the best alternative that is given up when a decision is made. The cost of attending a class includes not only tuition but also the time that could have been spent working or resting. Thinking in opportunity costs encourages comparison. It asks not only whether an option has benefits, but whether those benefits are greater than the benefits of the next best alternative.",
  },
  {
    id: "starter-central-banks",
    title: "The Role of Central Banks",
    topic: "Monetary Policy",
    minutes: 2,
    sourceName: "EconTyper Library",
    text: "Central banks influence financial conditions through monetary policy. They may adjust policy interest rates, provide liquidity to the banking system, and communicate their expectations about future policy. Higher interest rates can slow borrowing and spending, while lower rates can support demand. Central banks also work to preserve confidence in money and the financial system. Their decisions often involve trade-offs between inflation, employment, and financial stability.",
  },
  {
    id: "starter-comparative-advantage",
    title: "Comparative Advantage",
    topic: "Trade",
    minutes: 2,
    sourceName: "EconTyper Library",
    text: "Comparative advantage explains why specialization and trade can benefit participants even when one producer is more efficient at every task. The key is relative cost. A person, firm, or country should specialize in the activity it can perform at the lowest opportunity cost. By exchanging output, each side can consume more than it could produce alone. Real trade also depends on transportation, institutions, adjustment costs, and the distribution of gains.",
  },
  {
    id: "starter-competition",
    title: "Market Competition",
    topic: "Business",
    minutes: 2,
    sourceName: "EconTyper Library",
    text: "Competition gives firms a reason to improve products, reduce costs, and respond to customers. In a competitive market, a business that ignores quality or charges too much may lose buyers to rivals. Competition is not always perfect. Network effects, regulation, patents, scale advantages, and control of essential resources can make entry difficult. Economic analysis therefore considers both the number of firms and the actual ability of customers and competitors to switch.",
  },
];
