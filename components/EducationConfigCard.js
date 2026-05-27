"use client";

import { useEffect, useState } from "react";
import { FaGraduationCap, FaSchool } from "react-icons/fa";

export default function EducationConfigCard() {
  const [educationConfig, setEducationConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEducationConfig();
  }, []);

  const fetchEducationConfig = async () => {
    try {
      const response = await fetch("/api/school/education-config");
      if (response.ok) {
        const data = await response.json();
        setEducationConfig(data);
      } else {
        setEducationConfig(null);
      }
    } catch (error) {
      setEducationConfig(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
          <div className="h-3 bg-slate-200 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-slate-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const getEducationLevels = () => {
    if (!educationConfig) return [];

    const levels = [];
    if (educationConfig.educationLevels?.school) {
      const minGrade =
        educationConfig.schoolConfig?.schoolLevel?.minGrade ||
        educationConfig.schoolConfig?.minGrade ||
        1;
      const maxGrade =
        educationConfig.schoolConfig?.schoolLevel?.maxGrade ||
        educationConfig.schoolConfig?.maxGrade ||
        10;

      levels.push({
        name: "School Level",
        icon: FaSchool,
        color: "text-blue-600",
        bg: "bg-blue-50",
        details: `Grades ${minGrade}-${maxGrade}`,
      });
    }
    return levels;
  };

  const levels = getEducationLevels();

  if (!educationConfig || levels.length === 0) {
    return (
      <div className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-black text-[#17120a]">
          Education Configuration
        </h3>
        <p className="text-sm text-[#52657d]">No education configuration found</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-base font-black text-[#17120a]">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
          <FaGraduationCap />
        </span>
        Education Configuration
      </h3>

      <div className="space-y-3">
        {levels.map((level, index) => {
          const IconComponent = level.icon;
          return (
            <div
              key={index}
              className="rounded-xl border border-[#e6eaf7] bg-[#f8fbff] p-4"
            >
              <div className="flex items-center gap-3">
                <IconComponent className="text-xl text-purple-700" />
                <div>
                  <h4 className="font-black text-[#17120a]">{level.name}</h4>
                  <p className="text-sm text-[#52657d]">{level.details}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
