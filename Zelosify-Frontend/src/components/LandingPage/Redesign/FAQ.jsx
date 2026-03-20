"use client";
import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-white/5 last:border-0">
      <button 
        className="w-full py-6 flex items-center justify-between text-left group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`text-lg font-bold transition-colors ${isOpen ? "text-white" : "text-[#A1A1AA] group-hover:text-white"}`}>
          {question}
        </span>
        <motion.div 
          animate={{ rotate: isOpen ? 180 : 0 }}
          className={`
            w-8 h-8 rounded-full border border-white/10 flex items-center justify-center transition-colors
            ${isOpen ? "bg-white border-white text-black" : "text-[#A1A1AA]"}
          `}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="text-[#A1A1AA] leading-relaxed font-medium pb-6">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FAQ = () => {
  const faqs = [
    {
      question: "How accurate is the AI scoring engine?",
      answer: "Our scoring engine uses a deterministic formula combined with advanced entity extraction. We achieve a skill extraction accuracy of 99.8% and provide full explainability for every score produced."
    },
    {
      question: "Is my candidate data secure?",
      answer: "Absolutely. Zelosify is built with multi-tenant isolation at its core. Your data is encrypted at rest and in transit, and we never use your proprietary data to train models for other customers."
    },
    {
      question: "Can I customize the scoring criteria?",
      answer: "Yes, Professional and Enterprise plans allow you to define custom weighted criteria and specific skill requirements that the AI prioritizes during the matching process."
    },
    {
      question: "How long is the implementation process?",
      answer: "Most teams are up and running in under 15 minutes. Our pre-built integrations with major ATS platforms and communication tools mean you can sync your existing data instantly."
    }
  ];

  return (
    <section id="faq" className="py-24 px-4 bg-[#0B0B0C]/30 backdrop-blur-sm">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-sm font-bold text-amber-500 uppercase tracking-[0.2em] mb-4">
            Common Questions
          </h2>
          <h3 className="text-4xl font-bold text-white tracking-tight mb-4">
            Got questions? We&apos;ve got answers.
          </h3>
        </div>

        <div className="bg-[#0B0B0C] border border-white/5 rounded-[32px] p-8 md:p-12 shadow-2xl">
          {faqs.map((faq, index) => (
            <FAQItem key={index} {...faq} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
