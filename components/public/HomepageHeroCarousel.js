"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FaArrowRight,
  FaBookOpen,
  FaChevronLeft,
  FaChevronRight,
  FaShieldAlt,
  FaStar,
} from "react-icons/fa";

const SLIDE_TONES = [
  {
    glow: "bg-emerald-300/12",
    accent: "bg-[#22c55e]",
  },
  {
    glow: "bg-sky-300/12",
    accent: "bg-[#22c55e]",
  },
  {
    glow: "bg-emerald-300/12",
    accent: "bg-[#22c55e]",
  },
  {
    glow: "bg-sky-300/12",
    accent: "bg-[#22c55e]",
  },
];

function getPreview(value = "", maxLength = 150) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function getCategoryLabel(value) {
  const label = String(value || "Writing").replaceAll("_", " ").toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function HomepageHeroCarousel({ stories = [] }) {
  const slides = useMemo(() => {
    if (!stories.length) {
      return [
        {
          id: "empty-magazine-hero",
          title: "Student writing, published by schools",
          content:
            "Once schools publish student writing to the homepage, the latest stories will rotate here.",
          category: "School Magazine",
          author: "",
          schoolName: "",
          href: "/schools",
          empty: true,
        },
      ];
    }

    return stories.map((story) => ({
      ...story,
      category: getCategoryLabel(story.category),
    }));
  }, [stories]);

  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = slides[activeIndex] || slides[0];
  const tone = SLIDE_TONES[activeIndex % SLIDE_TONES.length];

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const move = (direction) => {
    setActiveIndex((current) => {
      if (direction === "next") return (current + 1) % slides.length;
      return (current - 1 + slides.length) % slides.length;
    });
  };

  return (
    <section
      className="pratyo-brand-surface relative min-h-[360px] overflow-hidden rounded-2xl p-5 text-white shadow-sm md:min-h-[430px] md:p-7"
    >
      <div className={`absolute -right-16 top-14 h-64 w-64 rounded-full ${tone.glow} blur-3xl`} />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/36 to-transparent" />
      <div className="absolute right-8 top-8 hidden h-28 w-28 rotate-6 rounded-3xl border border-white/20 bg-white/10 backdrop-blur md:block" />
      <div className="absolute right-24 top-28 hidden h-16 w-40 -rotate-3 rounded-2xl border border-white/15 bg-white/8 backdrop-blur md:block" />

      <div className="relative z-10 flex min-h-[320px] flex-col justify-between md:min-h-[376px]">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-black text-[#3120c9] shadow-sm">
            <FaStar />
            School Magazine
          </span>
          {slides.length > 1 && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => move("previous")}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/12 text-white backdrop-blur transition hover:bg-white/20"
                aria-label="Previous story"
              >
                <FaChevronLeft />
              </button>
              <button
                type="button"
                onClick={() => move("next")}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/12 text-white backdrop-blur transition hover:bg-white/20"
                aria-label="Next story"
              >
                <FaChevronRight />
              </button>
            </div>
          )}
        </div>

        <div className="max-w-3xl">
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-black uppercase text-white/92">
            <FaBookOpen />
            {activeSlide.category}
          </p>
          <h1 className="max-w-4xl text-3xl font-black leading-tight text-white drop-shadow-sm md:text-5xl">
            {activeSlide.title}
          </h1>
          {!activeSlide.empty && (
            <div className="mt-3 flex flex-wrap gap-3 text-sm font-black text-white">
              <span>by {activeSlide.author}</span>
              <span className="inline-flex items-center gap-2">
                <FaShieldAlt className="text-white/80" />
                {activeSlide.schoolName}
              </span>
            </div>
          )}
          <p className="mt-5 max-w-xl text-base font-semibold leading-8 text-white/90">
            {getPreview(activeSlide.content, activeSlide.empty ? 180 : 150)}
          </p>
          <Link
            href={activeSlide.href || "/student-voices"}
            className="mt-6 inline-flex w-fit items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-black text-[#3120c9] shadow-sm transition hover:-translate-y-0.5"
          >
            {activeSlide.empty ? "Explore Schools" : "Read Story"}
            <FaArrowRight />
          </Link>
        </div>

        <div className="flex items-center justify-center gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.id || slide.title}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`h-2.5 rounded-full transition-all ${
                index === activeIndex ? `w-8 ${tone.accent}` : "w-2.5 bg-white/55"
              }`}
              aria-label={`Show story ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
