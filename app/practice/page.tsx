import { PracticeWorkspace } from "@/components/practice/practice-workspace";

type PracticePageProps = {
  searchParams?: { session?: string };
};

export default function PracticePage({ searchParams }: PracticePageProps) {
  return <PracticeWorkspace sessionId={searchParams?.session ?? ""} />;
}
