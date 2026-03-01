"use client";

import { useScrollY } from "./_landing/shared";
import { Nav }         from "./_landing/Nav";
import { Hero }        from "./_landing/Hero";
import { WorksSection } from "./_landing/WorksSection";
import { TheGap, Stats, Accuracy, Testimonials } from "./_landing/Content";
import { Security, Pricing, FAQ, Footer } from "./_landing/Closing";

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
        <Accuracy/>
        <Testimonials/>
        <Security/>
        <Pricing/>
        <FAQ/>
      </main>
      <Footer/>
    </>
  );
}
