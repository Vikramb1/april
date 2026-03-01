"use client";

import { useScrollY } from "./_landing/shared";
import { Nav }         from "./_landing/Nav";
import { Hero }        from "./_landing/Hero";
import { ProductReveal, TheGap, Stats, HowItWorks, Features, Accuracy, Testimonials } from "./_landing/Content";
import { Pricing, Security, FAQ, FinalCTA, Footer } from "./_landing/Closing";

export default function LandingPage() {
  const scrollY = useScrollY();
  return (
    <>
      <Nav scrollY={scrollY}/>
      <main>
        <Hero/>
        <ProductReveal/>
        <TheGap/>
        <Stats/>
        <HowItWorks/>
        <Features/>
        <Accuracy/>
        <Testimonials/>
        <Pricing/>
        <Security/>
        <FAQ/>
        <FinalCTA/>
      </main>
      <Footer/>
    </>
  );
}
