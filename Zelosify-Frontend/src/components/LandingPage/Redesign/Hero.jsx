"use client";
import React from "react";
import { ArrowRight, Play } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative pt-40 pb-24 px-4 overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[20%] right-[-5%] w-[35%] h-[35%] bg-blue-600/10 blur-[120px] rounded-full" />
      <div className="absolute top-[10%] right-[10%] w-[25%] h-[25%] bg-indigo-600/5 blur-[100px] rounded-full" />

      <div className="max-w-5xl mx-auto text-center relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wider">
            Now in Private Beta
          </span>
          <div className="w-px h-3 bg-white/10 mx-1" />
          <span className="text-xs font-bold text-white flex items-center gap-1 cursor-pointer">
            Read more <ArrowRight className="w-3 h-3" />
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-8 leading-tight">
          Orchestrate your{" "}
          <span className="text-purple-400">
            recruitment with AI.
          </span>
        </h1>

        {/* Subtext */}
        <p className="text-xl md:text-2xl text-[#A1A1AA] max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
          The all-in-one platform for modern hiring teams. Automate resume parsing, 
          scoring, and candidate matching with precision-engineered AI-driven workflows.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button className="
            px-8 py-4 bg-white text-black font-bold rounded-2xl
            hover:bg-white/90 transition-all flex items-center gap-3
            shadow-[0_0_20px_rgba(255,255,255,0.1)]
          ">
            Start Hiring Now
            <ArrowRight className="w-5 h-5" />
          </button>
          <button className="
            px-8 py-4 bg-white/5 text-white font-bold rounded-2xl
            border border-white/10 hover:bg-white/10 transition-all
            flex items-center gap-3
          ">
            <Play className="w-4 h-4 fill-white" />
            Watch Product Tour
          </button>
        </div>

        {/* Social Proof / Trust */}
        <div className="mt-24 pt-10 border-t border-white/5">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-8">
            Trusted by forward-thinking teams
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8 grayscale opacity-40">
            {/* Using text logos for placeholder */}
            <span className="text-2xl font-bold text-white tracking-tighter">LINEAR</span>
            <span className="text-2xl font-bold text-white tracking-tighter">VERCEL</span>
            <span className="text-2xl font-bold text-white tracking-tighter">STRIPE</span>
            <span className="text-2xl font-bold text-white tracking-tighter">RAYCAST</span>
            <span className="text-2xl font-bold text-white tracking-tighter">LOOM</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
