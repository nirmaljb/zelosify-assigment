"use client";
import React from "react";
import { Check, ArrowRight } from "lucide-react";

const PricingCard = ({ tier, price, description, features, highlighted = false }) => (
  <div className={`
    p-8 rounded-[32px] border flex flex-col transition-all duration-300
    ${highlighted 
      ? "bg-white text-black border-white shadow-[0_0_50px_rgba(255,255,255,0.1)] scale-105 z-10" 
      : "bg-[#0B0B0C] text-white border-white/10 hover:border-white/20"}
  `}>
    <h3 className={`text-lg font-bold mb-2 uppercase tracking-widest ${highlighted ? "text-zinc-500" : "text-zinc-500"}`}>
      {tier}
    </h3>
    <div className="flex items-baseline gap-1 mb-4">
      <span className="text-4xl font-bold tracking-tighter">{price}</span>
      {price !== "Custom" && <span className="text-sm font-medium opacity-60">/mo</span>}
    </div>
    <p className={`text-sm mb-8 font-medium leading-relaxed ${highlighted ? "text-zinc-600" : "text-[#A1A1AA]"}`}>
      {description}
    </p>
    
    <div className="flex-1 space-y-4 mb-8">
      {features.map((feature, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${highlighted ? "bg-black text-white" : "bg-white/10 text-white"}`}>
            <Check className="w-3 h-3" />
          </div>
          <span className="text-sm font-bold tracking-tight">{feature}</span>
        </div>
      ))}
    </div>

    <button className={`
      w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all
      ${highlighted 
        ? "bg-black text-white hover:bg-zinc-800" 
        : "bg-white/10 text-white hover:bg-white/20 border border-white/10"}
    `}>
      Get Started
      <ArrowRight className="w-4 h-4" />
    </button>
  </div>
);

const Pricing = () => {
  return (
    <section id="pricing" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-sm font-bold text-indigo-500 uppercase tracking-[0.2em] mb-4">
            Fair Pricing
          </h2>
          <h3 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">
            Scale your hiring, <br /> not your costs.
          </h3>
          <p className="text-[#A1A1AA] max-w-2xl mx-auto font-medium">
            Choose a plan that fits your current needs and scale when you're ready. 
            No hidden fees or long-term commitments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <PricingCard 
            tier="Starter"
            price="$29"
            description="Perfect for small teams and early-stage startups."
            features={[
              "Up to 5 active openings",
              "Unlimited resume uploads",
              "Basic AI matching",
              "1-day support turnaround"
            ]}
          />
          <PricingCard 
            tier="Professional"
            price="$99"
            description="Advanced features for growing companies."
            features={[
              "Up to 25 active openings",
              "Personalized match reasoning",
              "Full integration ecosystem",
              "Virtualization for 50+ records",
              "Priority 2h support"
            ]}
            highlighted
          />
          <PricingCard 
            tier="Enterprise"
            price="Custom"
            description="Bespoke solutions for large organizations."
            features={[
              "Unlimited everything",
              "Custom matching logic",
              "SLA guarantees",
              "Dedicated account manager",
              "White-glove implementation"
            ]}
          />
        </div>
      </div>
    </section>
  );
};

export default Pricing;
