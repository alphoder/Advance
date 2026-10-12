import { SiteNav, SiteFooter } from "@/components/site/nav";
import { Hero, HowItWorks, Bento, Compare, WhyMonad, TwoPaths } from "@/components/site/sections";
import { ScoreChecker } from "@/components/site/checker";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <ScoreChecker />
        <Bento />
        <Compare />
        <WhyMonad />
        <TwoPaths />
      </main>
      <SiteFooter />
    </>
  );
}
