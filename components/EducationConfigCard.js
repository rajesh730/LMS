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
        console.error("Failed to fetch education config");
      }
    } catch (error) {
      console.error("Error fetching education config:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
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
      levels.push({
        name: "School Level",
        icon: FaSchool,
        color: "text-blue-600",
        bg: "bg-blue-50",
        details: `Grades 1-${educationConfig.schoolConfig?.maxGrade || 10}`,
      });
    }
    return levels;
  };

  const levels = getEducationLevels();

  if (!educationConfig || levels.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Education Configuration
        </h3>
        <p className="text-slate-500">No education configuration found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <FaGraduationCap className="text-indigo-600" />
        Education Configuration
      </h3>

      <div className="space-y-3">
        {levels.map((level, index) => {
          const IconComponent = level.icon;
          return (
            <div
              key={index}
              className={`${level.bg} rounded-lg p-4 border border-opacity-20 border-slate-300`}
            >
              <div className="flex items-center gap-3">
                <IconComponent className={`text-xl ${level.color}`} />
                <div>
                  <h4 className="font-medium text-slate-800">{level.name}</h4>
                  <p className="text-sm text-slate-600">{level.details}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
