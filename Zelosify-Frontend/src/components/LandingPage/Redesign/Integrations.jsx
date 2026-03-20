"use client";
import React from "react";
import { Link2, Cloud, Database, Layout, Search, Mail } from "lucide-react";

const Integrations = () => {
  return (
    <section id="integrations" className="py-24 px-4 overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-purple-600/5 blur-[120px] rounded-full" />

      <div className="max-w-6xl mx-auto flex flex-col items-center">
        <div className="text-center mb-16 relative z-10">
          <h2 className="text-sm font-bold text-blue-500 uppercase tracking-[0.2em] mb-4">
            Ecosystem
          </h2>
          <h3 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">
            Fits right into your <br /> existing workflow.
          </h3>
          <p className="text-[#A1A1AA] max-w-2xl mx-auto font-medium">
            Connect Zelosify with the tools you already use. From Applicant Tracking 
            Systems to communication platforms, we&apos;ve got you covered.
          </p>
        </div>

        {/* Integration Cluster - Simplified */}
        <div className="w-full max-w-4xl flex flex-wrap items-center justify-center gap-6 relative z-20">
          {[Cloud, Database, Link2, Layout, Search, Mail].map((Icon, index) => (
            <div 
              key={index} 
              className="w-20 h-20 rounded-2xl bg-[#0B0B0C] border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.02)] hover:border-white/30 hover:-translate-y-1 transition-all duration-300"
            >
              <Icon className="w-8 h-8 text-white/80" />
            </div>
          ))}
        </div>

        <button className="mt-16 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all font-bold text-sm z-20">
          Explore All Integrations
        </button>
      </div>
    </section>
  );
};

export default Integrations;
