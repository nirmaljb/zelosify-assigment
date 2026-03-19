"use client";
import React from "react";
import { Link2, Cloud, Database, Layout, Search, Mail } from "lucide-react";

const LogoCircle = ({ icon: Icon, className, pulse = false }) => (
  <div className={`
    w-16 h-16 rounded-3xl bg-[#0B0B0C] border border-white/10 flex items-center justify-center
    shadow-[0_0_20px_rgba(255,255,255,0.05)] relative
    ${pulse ? "animate-bounce" : ""}
    ${className}
  `}>
    <Icon className="w-6 h-6 text-white" />
    <div className="absolute inset-0 rounded-3xl bg-white/5 opacity-0 hover:opacity-100 transition-opacity" />
  </div>
);

const Integrations = () => {
  return (
    <section id="integrations" className="py-24 px-4 overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-purple-600/5 blur-[120px] rounded-full" />

      <div className="max-w-6xl mx-auto flex flex-col items-center">
        <div className="text-center mb-20 relative z-10">
          <h2 className="text-sm font-bold text-blue-500 uppercase tracking-[0.2em] mb-4">
            Ecosystem
          </h2>
          <h3 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">
            Fits right into your <br /> existing workflow.
          </h3>
          <p className="text-[#A1A1AA] max-w-2xl mx-auto font-medium">
            Connect Zelosify with the tools you already use. From Applicant Tracking 
            Systems to communication platforms, we've got you covered.
          </p>
        </div>

        {/* Integration Cluster */}
        <div className="relative w-full max-w-2xl h-[400px] flex items-center justify-center">
          {/* Center Logo */}
          <div className="w-24 h-24 rounded-[32px] bg-white flex items-center justify-center relative z-20 shadow-[0_0_50px_rgba(255,255,255,0.15)]">
            <div className="w-10 h-10 bg-black rounded-lg rotate-45" />
          </div>

          {/* Floating Logos */}
          <LogoCircle icon={Cloud} className="absolute top-0 left-[20%]" pulse />
          <LogoCircle icon={Database} className="absolute top-0 right-[20%]" />
          <LogoCircle icon={Link2} className="absolute bottom-10 left-[10%]" />
          <LogoCircle icon={Layout} className="absolute bottom-10 right-[10%]" pulse />
          <LogoCircle icon={Search} className="absolute top-[30%] left-[-5%]" />
          <LogoCircle icon={Mail} className="absolute top-[30%] right-[-5%]" />

          {/* Connecting Lines (Simulated with CSS) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-10">
            <line x1="50%" y1="50%" x2="25%" y2="10%" stroke="white" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="50%" y1="50%" x2="75%" y2="10%" stroke="white" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="50%" y1="50%" x2="15%" y2="85%" stroke="white" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="50%" y1="50%" x2="85%" y2="85%" stroke="white" strokeWidth="1" strokeDasharray="4 4" />
          </svg>
        </div>

        <button className="mt-12 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all font-bold text-sm">
          Explore All Integrations
        </button>
      </div>
    </section>
  );
};

export default Integrations;
