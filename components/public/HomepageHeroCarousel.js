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
import SchoolLogoMark from "@/components/public/SchoolLogoMark";

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
          content: "",
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
      className="home-mobile-hero-bleed pravyo-brand-surface relative min-h-[280px] overflow-hidden rounded-2xl p-4 text-white shadow-sm md:min-h-[390px] md:p-7"
    >
      <div className="absolute bottom-0 left-0 right-0 h-px bg-white/20" />

      <div className="relative z-10 flex min-h-[248px] flex-col justify-between md:min-h-[336px]">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#1f4e79] shadow-sm">
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
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase text-white/92">
            <FaBookOpen />
            {activeSlide.category}
          </p>
          <h1 className="home-mobile-hero-title max-w-4xl text-xl font-semibold leading-tight text-white md:text-4xl md:font-bold">
            {activeSlide.title}
          </h1>
          {!activeSlide.empty && (
            <div className="home-mobile-hero-meta mt-3 flex flex-wrap gap-3 text-sm font-semibold text-white">
              <span>by {activeSlide.author}</span>
              <span className="inline-flex items-center gap-2">
                <FaShieldAlt className="text-white/80" />
                {activeSlide.schoolName}
              </span>
            </div>
          )}
          {activeSlide.content && (
            <p className="home-mobile-hero-copy mt-4 max-w-xl text-sm font-medium leading-6 text-white/90 md:mt-5 md:text-base md:leading-7">
              {getPreview(activeSlide.content, activeSlide.empty ? 180 : 150)}
            </p>
          )}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-6">
            <Link
              href={activeSlide.href || "/student-voices"}
              className="inline-flex w-fit items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#1f4e79] shadow-sm transition hover:-translate-y-0.5"
            >
              {activeSlide.empty ? "Explore Schools" : "Read Story"}
              <FaArrowRight />
            </Link>
            {!activeSlide.empty && activeSlide.schoolHref && (
              <Link
                href={activeSlide.schoolHref}
                className="inline-flex min-w-0 items-center gap-3 rounded-xl border border-white/20 bg-white/12 px-3 py-2 text-white backdrop-blur transition hover:bg-white/18"
              >
                <SchoolLogoMark
                  imageUrl={activeSlide.schoolLogoUrl}
                  name={activeSlide.schoolName}
                  className="h-9 w-9"
                  shapeClassName="rounded-lg"
                />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-white/75">
                    School Profile
                  </span>
                  <span className="block truncate text-sm font-bold">
                    {activeSlide.schoolName || "School"}
                  </span>
                </span>
                <span className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-[#1f4e79]">
                  See Profile
                </span>
              </Link>
            )}
          </div>
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
