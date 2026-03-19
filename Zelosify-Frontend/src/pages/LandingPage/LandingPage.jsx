import React from "react";
import Navbar from "@/components/LandingPage/Redesign/Navbar";
import Hero from "@/components/LandingPage/Redesign/Hero";
import Features from "@/components/LandingPage/Redesign/Features";
import Integrations from "@/components/LandingPage/Redesign/Integrations";
import Pricing from "@/components/LandingPage/Redesign/Pricing";
import FAQ from "@/components/LandingPage/Redesign/FAQ";
import Footer from "@/components/LandingPage/Redesign/Footer";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0C] selection:bg-white selection:text-black">
      <Navbar />
      <Hero />
      <Features />
      <Integrations />
      <Pricing />
      <FAQ />
      <Footer />
    </main>
  );
}
