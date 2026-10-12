import { ScoreChecker } from "@/components/site/checker";
import { NextPage } from "@/components/site/kit";

export default function Check() {
  return (
    <>
      <ScoreChecker />
      <NextPage href="/how-it-works" title="How does the score work?" sub="See the whole product in four steps, with a simulator." />
    </>
  );
}
