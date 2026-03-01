"use client";

import { useScrollY } from "./_landing/shared";
import { Nav }         from "./_landing/Nav";
import { Hero }        from "./_landing/Hero";
import { WorksSection } from "./_landing/WorksSection";
import { TheGap, Stats } from "./_landing/Content";
import { Security, FAQ, Footer } from "./_landing/Closing";

export default function LandingPage() {
  const scrollY = useScrollY();
  return (
    <>
      <Nav scrollY={scrollY}/>
      <main>
        <Hero/>
        <WorksSection/>
        <TheGap/>
        <Stats/>
        <Security/>
        <FAQ/>
      </main>
      <Footer/>
    </>
  );
}
