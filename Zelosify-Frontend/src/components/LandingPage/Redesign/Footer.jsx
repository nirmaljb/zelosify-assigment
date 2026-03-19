"use client";
import React from "react";
import Link from "next/link";
import { Github, Twitter, Linkedin, ArrowUpRight } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const links = {
    Product: [
      { name: "Features", href: "#features" },
      { name: "Integrations", href: "#integrations" },
      { name: "Pricing", href: "#pricing" },
      { name: "Changelog", href: "#" }
    ],
    Company: [
      { name: "About Us", href: "#" },
      { name: "Careers", href: "#" },
      { name: "Blog", href: "#" },
      { name: "Contact", href: "#" }
    ],
    Legal: [
      { name: "Privacy Policy", href: "#" },
      { name: "Terms of Service", href: "#" },
      { name: "Security", href: "#" }
    ]
  };

  return (
    <footer className="py-24 px-4 border-t border-white/5 bg-[#0B0B0C]">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-16">
          {/* Brand */}
          <div className="col-span-2 space-y-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-black rounded-sm rotate-45" />
              </div>
              <span className="text-white font-bold tracking-tight text-xl">Zelosify</span>
            </Link>
            <p className="text-[#A1A1AA] text-sm font-medium leading-relaxed max-w-xs">
              The modern standard for AI-driven recruitment and candidate matching. 
              Build a world-class team with precision and speed.
            </p>
            <div className="flex gap-4">
              <button size="icon" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all">
                <Twitter className="w-4 h-4" />
              </button>
              <button size="icon" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all">
                <Github className="w-4 h-4" />
              </button>
              <button size="icon" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all">
                <Linkedin className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Links */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category} className="space-y-6">
              <h4 className="text-xs font-bold text-white uppercase tracking-[0.2em]">{category}</h4>
              <ul className="space-y-4">
                {items.map((item) => (
                  <li key={item.name}>
                    <Link 
                      href={item.href} 
                      className="text-sm font-bold text-[#A1A1AA] hover:text-white transition-colors flex items-center gap-1 group"
                    >
                      {item.name}
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
            © {currentYear} Zelosify Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Systems Operational</span>
            </div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">English (US)</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
