"use client";
import React from "react";
import { 
  Zap, 
  Shield, 
  Cpu, 
  BarChart3, 
  Users, 
  Sparkles 
} from "lucide-react";

const FeatureCard = ({ icon: Icon, title, description }) => (
  <div className="group p-8 rounded-3xl bg-[#0B0B0C] border border-white/5 hover:border-white/20 transition-all duration-300">
    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:bg-white group-hover:text-black transition-all duration-300">
      <Icon className="w-6 h-6 transition-colors" />
    </div>
    <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{title}</h3>
    <p className="text-[#A1A1AA] leading-relaxed text-sm font-medium">
      {description}
    </p>
  </div>
);

const Features = () => {
  const features = [
    {
      icon: Cpu,
      title: "AI Resumé Analysis",
      description: "Extract skills, experience, and intent from any resume with 99.9% accuracy using our custom LLM orchestrator."
    },
    {
      icon: Zap,
      title: "Instant Scoring",
      description: "Candidates are automatically scored against your specific job requirements within milliseconds of submission."
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Multi-tenant isolation and strict RBAC ensure your candidate data is always private and platform-secure."
    },
    {
      icon: BarChart3,
      title: "Match Confidence",
      description: "Our agent doesn't just score; it provides reasoning and confidence intervals for every recommendation."
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Shortlist, reject, and comment on profiles with your team in real-time. Shared decision-making made easy."
    },
    {
      icon: Sparkles,
      title: "Deterministic AI",
      description: "No hallucinations. Our scoring engine uses deterministic formulas backed by AI-extracted features."
    }
  ];

  return (
    <section id="features" className="py-24 px-4 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-sm font-bold text-purple-500 uppercase tracking-[0.2em] mb-4">
            Powerful Features
          </h2>
          <h3 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">
            Everything you need <br className="hidden md:block" /> to hire at scale.
          </h3>
          <p className="text-[#A1A1AA] max-w-2xl mx-auto font-medium">
            Zelosify replaces your fragmented hiring stack with a unified platform 
            designed for speed, accuracy, and enterprise reliability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
