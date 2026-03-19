"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4">
      <div 
        className={`
          w-full max-w-5xl flex items-center justify-between px-6 py-3
          rounded-2xl border transition-all duration-300
          ${isScrolled 
            ? "bg-[#0B0B0C]/70 backdrop-blur-md border-white/10 shadow-2xl" 
            : "bg-transparent border-transparent"}
        `}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-black rounded-sm rotate-45" />
          </div>
          <span className="text-white font-bold tracking-tight text-xl">Zelosify</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {["Features", "Integrations", "Pricing", "FAQ"].map((item) => (
            <Link 
              key={item} 
              href={`#${item.toLowerCase()}`}
              className="text-sm font-medium text-[#A1A1AA] hover:text-white transition-colors"
            >
              {item}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-4">
          <Link 
            href="/login" 
            className="text-sm font-medium text-white hover:opacity-80 transition-opacity"
          >
            Log in
          </Link>
          <Link 
            href="/signup" 
            className="
              px-5 py-2.5 bg-white text-black text-sm font-bold
              rounded-xl hover:bg-white/90 transition-all flex items-center gap-2
            "
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden text-white"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="absolute top-24 left-4 right-4 bg-[#0B0B0C] border border-white/10 rounded-2xl p-6 md:hidden shadow-2xl">
          <div className="flex flex-col gap-6">
            {["Features", "Integrations", "Pricing", "FAQ"].map((item) => (
              <Link 
                key={item} 
                href={`#${item.toLowerCase()}`}
                className="text-lg font-medium text-[#A1A1AA]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item}
              </Link>
            ))}
            <div className="border-t border-white/5 pt-6 flex flex-col gap-4">
              <Link href="/login" className="text-white font-medium">Log in</Link>
              <Link 
                href="/signup" 
                className="w-full py-4 bg-white text-black text-center font-bold rounded-xl"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
