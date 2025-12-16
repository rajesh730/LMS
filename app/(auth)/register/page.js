"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProgressIndicator from "@/components/ProgressIndicator";
import SearchableDropdown from "@/components/SearchableDropdown";
import {
  nepalLocationData,
  schoolTypes,
  affiliationBoards,
  getAvailableDistricts,
  getAvailableMunicipalities,
} from "@/lib/nepalLocationData";
import {
  FaSchool,
  FaMapMarkerAlt,
  FaUserTie,
  FaGraduationCap,
  FaPalette,
  FaLock,
} from "react-icons/fa";

const STEPS = [
  { id: "basic", title: "School Info", icon: FaSchool },
  { id: "location", title: "Location", icon: FaMapMarkerAlt },
  { id: "principal", title: "Principal", icon: FaUserTie },
  { id: "login", title: "Login Info", icon: FaLock },
  { id: "education", title: "Education", icon: FaGraduationCap },
  { id: "theme", title: "Theme", icon: FaPalette },
];

// Utility function to normalize faculty names (trim spaces)
const normalizeFaculties = (facultiesString) => {
  if (!facultiesString || typeof facultiesString !== 'string') return '';
  return facultiesString
    .split(',')
    .map(f => f.trim())
    .filter(f => f.length > 0)
    .join(', ');
};

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [formData, setFormData] = useState({
    // Basic Information
    schoolName: "",
    schoolNameNepali: "",
    schoolType: "",
    customSchoolType: "",
    affiliation: "",
    customAffiliation: "",
    establishedYear: "",
    registrationNumber: "",
    schoolPhone: "",
    schoolEmail: "",

    // Location Information
    province: "",
    district: "",
    municipality: "",
    customMunicipality: "",
    ward: "",
    tole: "",
    streetAddress: "",
    postalCode: "",

    // Principal Information
    principalName: "",
    principalPhone: "",
    alternatePhone: "",

    // Login Information
    email: "",
    password: "",
    confirmPassword: "",
    website: "",

    // Education Levels
    educationLevels: {
      school: false,
      highSchool: false,
      bachelor: false,
    },
    schoolConfig: {
      schoolLevel: {
        minGrade: 1,
        maxGrade: 10,
      },
      highSchool: {
        faculties: "",
      },
      bachelor: {
        startingYear: 1,
        endingYear: 4,
        hasSemesters: false,
        faculties: "",
      },
    },

    // Theme
    primaryColor: "#10b981",
    secondaryColor: "#6b7280",
    useDefaultTheme: true,
  });

  const [stepErrors, setStepErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const updateFormData = useCallback((updates) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const isStrongPassword = (pwd) => {
    return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(pwd || "");
  };

  const validateStep = (stepIndex) => {
    const errors = {};

    switch (stepIndex) {
      case 0: // Basic Info
        if (!formData.schoolName.trim())
          errors.schoolName = "School name is required";
        if (!formData.schoolType) errors.schoolType = "School type is required";
        if (
          formData.schoolType === "Other (Specify)" &&
          !formData.customSchoolType.trim()
        ) {
          errors.customSchoolType = "Custom school type is required";
        }
        if (!formData.affiliation)
          errors.affiliation = "Affiliation is required";
        if (
          formData.affiliation === "Other (Specify)" &&
          !formData.customAffiliation.trim()
        ) {
          errors.customAffiliation = "Custom affiliation is required";
        }
        const year = parseInt(formData.establishedYear);
        if (
          !formData.establishedYear ||
          isNaN(year) ||
          year < 1900 ||
          year > new Date().getFullYear()
        ) {
          errors.establishedYear = "Valid established year is required";
        }
        if (!formData.schoolPhone.trim())
          errors.schoolPhone = "School phone is required";
        if (!formData.schoolEmail.trim())
          errors.schoolEmail = "School email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.schoolEmail))
          errors.schoolEmail = "Valid email is required";
        break;

      case 1: // Location
        if (!formData.province) errors.province = "Province is required";
        if (!formData.district) errors.district = "District is required";
        if (!formData.municipality)
          errors.municipality = "Municipality is required";
        if (
          formData.municipality === "Other (Specify)" &&
          !formData.customMunicipality.trim()
        ) {
          errors.customMunicipality = "Custom municipality is required";
        }
        if (!formData.ward) errors.ward = "Ward number is required";
        break;

      case 2: // Principal
        if (!formData.principalName.trim())
          errors.principalName = "Principal name is required";
        if (!formData.principalPhone.trim())
          errors.principalPhone = "Principal phone is required";
        break;

      case 3: // Login
        if (!isStrongPassword(formData.password)) {
          errors.password =
            "Password must be at least 8 characters with letter and number";
        }
        if (formData.password !== formData.confirmPassword) {
          errors.confirmPassword = "Passwords do not match";
        }
        break;

      case 4: // Education
        const hasEducationLevel = Object.values(formData.educationLevels).some(
          (level) => level
        );
        if (!hasEducationLevel)
          errors.educationLevels = "Select at least one education level";

        // Check if high school is selected but no faculty is provided
        if (
          formData.educationLevels.highSchool &&
          !formData.schoolConfig.highSchool.faculties?.trim()
        ) {
          errors.highSchoolFaculty =
            "Please specify the faculties/streams for high school";
        }

        // Check if bachelor is selected but no faculties are provided
        if (
          formData.educationLevels.bachelor &&
          !formData.schoolConfig.bachelor.faculties?.trim()
        ) {
          errors.bachelorFaculties =
            "Please specify the faculties/programs for bachelor level";
        }
        break;
    }

    return errors;
  };

  const handleNext = () => {
    const errors = validateStep(currentStep);
    if (Object.keys(errors).length > 0) {
      setStepErrors({ ...stepErrors, [currentStep]: errors });
      return;
    }

    setStepErrors({ ...stepErrors, [currentStep]: {} });
    setCompletedSteps((prev) => [...new Set([...prev, currentStep])]);
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex) => {
    // Allow clicking on current step, previous steps, or next step if current is completed
    if (stepIndex <= currentStep || completedSteps.includes(stepIndex - 1)) {
      setCurrentStep(stepIndex);
    }
  };

  const handleEducationLevelChange = (level) => {
    const newEducationLevels = {
      ...formData.educationLevels,
      [level]: !formData.educationLevels[level],
    };

    // Build schoolConfig dynamically based on selected education levels
    const newSchoolConfig = {};

    // If SCHOOL is selected, add schoolLevel with grades 1-10
    if (newEducationLevels.school) {
      newSchoolConfig.schoolLevel = {
        minGrade: 1,
        maxGrade: 10,
      };
    } 
    // If ONLY HIGH SCHOOL is selected (no school), set grades 11-12
    else if (newEducationLevels.highSchool && !newEducationLevels.school) {
      newSchoolConfig.schoolLevel = {
        minGrade: 11,
        maxGrade: 12,
      };
    }
    // If ONLY BACHELOR is selected, no schoolLevel
    else if (newEducationLevels.bachelor && !newEducationLevels.school && !newEducationLevels.highSchool) {
      // No schoolLevel for bachelor only
    }

    // Add highSchool config if selected
    if (newEducationLevels.highSchool) {
      newSchoolConfig.highSchool = formData.schoolConfig.highSchool;
    }

    // Add bachelor config if selected
    if (newEducationLevels.bachelor) {
      newSchoolConfig.bachelor = formData.schoolConfig.bachelor;
    }

    updateFormData({
      educationLevels: newEducationLevels,
      schoolConfig: newSchoolConfig,
    });
  };

  const handleLocationChange = (field, value) => {
    const updates = { [field]: value };

    if (field === "province") {
      updates.district = "";
      updates.municipality = "";
      updates.ward = "";
    } else if (field === "district") {
      updates.municipality = "";
      updates.ward = "";
    }

    updateFormData(updates);
  };

  const handleSubmit = async () => {
    const finalErrors = validateStep(currentStep);
    if (Object.keys(finalErrors).length > 0) {
      setStepErrors({ ...stepErrors, [currentStep]: finalErrors });
      return;
    }

    setLoading(true);

    try {
      // Build schoolConfig dynamically (same logic as handleEducationLevelChange)
      const cleanedSchoolConfig = {};

      // If SCHOOL is selected, add schoolLevel with grades 1-10
      if (formData.educationLevels.school) {
        cleanedSchoolConfig.schoolLevel = formData.schoolConfig.schoolLevel;
      } 
      // If ONLY HIGH SCHOOL is selected (no school), set grades 11-12
      else if (formData.educationLevels.highSchool && !formData.educationLevels.school) {
        cleanedSchoolConfig.schoolLevel = {
          minGrade: 11,
          maxGrade: 12,
        };
      }
      // If ONLY BACHELOR is selected, no schoolLevel

      // Add highSchool config if selected
      if (formData.educationLevels.highSchool) {
        cleanedSchoolConfig.highSchool = {
          ...formData.schoolConfig.highSchool,
          faculties: normalizeFaculties(formData.schoolConfig.highSchool.faculties),
        };
      }

      // Add bachelor config if selected
      if (formData.educationLevels.bachelor) {
        cleanedSchoolConfig.bachelor = {
          ...formData.schoolConfig.bachelor,
          faculties: normalizeFaculties(formData.schoolConfig.bachelor.faculties),
        };
      }

      // Prepare final form data
      const submitData = {
        ...formData,
        email: formData.schoolEmail, // Use school email for login
        establishedYear: parseInt(formData.establishedYear), // Convert to number
        schoolLocation: `${formData.municipality}, Ward ${formData.ward}, ${formData.district}, ${formData.province}`,
        schoolConfig: cleanedSchoolConfig, // Use cleaned config
      };

      console.log("Submitting registration data:", JSON.stringify(submitData, null, 2));

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      const data = await res.json();
      console.log("Registration response:", data, "Status:", res.status);

      if (res.ok) {
        alert("School registered successfully! Please wait for approval.");
        router.push("/login");
      } else {
        setStepErrors({
          ...stepErrors,
          [currentStep]: { submit: data.message || "Registration failed" },
        });
      }
    } catch (error) {
      console.error("Registration error:", error);
      setStepErrors({
        ...stepErrors,
        [currentStep]: { submit: "Something went wrong. Please try again." },
      });
    } finally {
      setLoading(false);
    }
  };

  const renderBasicInfoStep = () => {
    const errors = stepErrors[0] || {};

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              School Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              className={`w-full border rounded-lg p-3 bg-slate-700 text-white placeholder-slate-400 ${
                errors.schoolName
                  ? "border-red-400 focus:ring-red-500"
                  : "border-slate-600 focus:ring-emerald-500"
              } focus:outline-none focus:ring-2`}
              value={formData.schoolName}
              onChange={(e) => updateFormData({ schoolName: e.target.value })}
              placeholder="Enter school name"
            />
            {errors.schoolName && (
              <p className="text-red-400 text-sm mt-1">{errors.schoolName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              School Name (Nepali)
            </label>
            <input
              type="text"
              className="w-full border border-slate-600 rounded-lg p-3 bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={formData.schoolNameNepali}
              onChange={(e) =>
                updateFormData({ schoolNameNepali: e.target.value })
              }
              placeholder="स्कूलको नाम"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              School Type <span className="text-red-500">*</span>
            </label>
            <SearchableDropdown
              options={schoolTypes.map((type, index) => ({
                id: index,
                name: type,
              }))}
              value={formData.schoolType}
              onChange={(value) => updateFormData({ schoolType: value })}
              placeholder="Select school type"
              error={errors.schoolType}
              searchable={false}
            />
            {formData.schoolType === "Other (Specify)" && (
              <div className="mt-3">
                <input
                  type="text"
                  className={`w-full border rounded-lg p-3 ${
                    errors.customSchoolType
                      ? "border-red-400"
                      : "border-gray-300"
                  }`}
                  value={formData.customSchoolType}
                  onChange={(e) =>
                    updateFormData({ customSchoolType: e.target.value })
                  }
                  placeholder="Specify school type"
                />
                {errors.customSchoolType && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.customSchoolType}
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Affiliation <span className="text-red-500">*</span>
            </label>
            <SearchableDropdown
              options={affiliationBoards.map((board, index) => ({
                id: index,
                name: board,
              }))}
              value={formData.affiliation}
              onChange={(value) => updateFormData({ affiliation: value })}
              placeholder="Select affiliation"
              error={errors.affiliation}
              searchable={false}
            />
            {formData.affiliation === "Other (Specify)" && (
              <div className="mt-3">
                <input
                  type="text"
                  className={`w-full border rounded-lg p-3 ${
                    errors.customAffiliation
                      ? "border-red-400"
                      : "border-gray-300"
                  }`}
                  value={formData.customAffiliation}
                  onChange={(e) =>
                    updateFormData({ customAffiliation: e.target.value })
                  }
                  placeholder="Specify affiliation"
                />
                {errors.customAffiliation && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.customAffiliation}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Established Year <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              className={`w-full border rounded-lg p-3 bg-slate-700 text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                errors.establishedYear ? "border-red-400" : "border-slate-600"
              }`}
              value={formData.establishedYear || ""}
              onChange={(e) =>
                updateFormData({ establishedYear: e.target.value })
              }
              placeholder="2000"
              min="1900"
              max={new Date().getFullYear()}
            />
            {errors.establishedYear && (
              <p className="text-red-500 text-sm mt-1">
                {errors.establishedYear}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Registration Number
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg p-3"
              value={formData.registrationNumber}
              onChange={(e) =>
                updateFormData({ registrationNumber: e.target.value })
              }
              placeholder="Official registration number"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              School Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              className={`w-full border rounded-lg p-3 ${
                errors.schoolPhone ? "border-red-400" : "border-gray-300"
              }`}
              value={formData.schoolPhone}
              onChange={(e) => updateFormData({ schoolPhone: e.target.value })}
              placeholder="01xxxxxxx or 98xxxxxxxx"
            />
            {errors.schoolPhone && (
              <p className="text-red-500 text-sm mt-1">{errors.schoolPhone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              className={`w-full border rounded-lg p-3 ${
                errors.schoolEmail ? "border-red-400" : "border-gray-300"
              }`}
              value={formData.schoolEmail}
              onChange={(e) => updateFormData({ schoolEmail: e.target.value })}
              placeholder="info@schoolname.edu.np"
            />
            {errors.schoolEmail && (
              <p className="text-red-500 text-sm mt-1">{errors.schoolEmail}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderLocationStep = () => {
    const errors = stepErrors[1] || {};
    const availableDistricts = getAvailableDistricts(formData.province);
    const availableMunicipalities = getAvailableMunicipalities(
      formData.district
    );

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Province <span className="text-red-500">*</span>
            </label>
            <SearchableDropdown
              options={nepalLocationData.provinces}
              value={formData.province}
              onChange={(value) => handleLocationChange("province", value)}
              placeholder="Select Province"
              error={errors.province}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              District <span className="text-red-500">*</span>
            </label>
            <SearchableDropdown
              options={availableDistricts}
              value={formData.district}
              onChange={(value) => handleLocationChange("district", value)}
              placeholder="Select District"
              disabled={!formData.province}
              error={errors.district}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Municipality/VDC <span className="text-red-500">*</span>
            </label>
            <SearchableDropdown
              options={availableMunicipalities}
              value={formData.municipality}
              onChange={(value) => updateFormData({ municipality: value })}
              placeholder="Select Municipality"
              disabled={!formData.district}
              error={errors.municipality}
              showType={true}
            />
            {formData.municipality === "Other (Specify)" && (
              <div className="mt-3">
                <input
                  type="text"
                  className={`w-full border rounded-lg p-3 ${
                    errors.customMunicipality
                      ? "border-red-400"
                      : "border-gray-300"
                  }`}
                  value={formData.customMunicipality}
                  onChange={(e) =>
                    updateFormData({ customMunicipality: e.target.value })
                  }
                  placeholder="Specify municipality name"
                />
                {errors.customMunicipality && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.customMunicipality}
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Ward No. <span className="text-red-400">*</span>
            </label>
            <select
              className={`w-full border rounded-lg p-3 bg-slate-700 text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                errors.ward ? "border-red-400" : "border-slate-600"
              }`}
              value={formData.ward}
              onChange={(e) => updateFormData({ ward: e.target.value })}
              disabled={!formData.municipality}
            >
              <option value="">Select Ward</option>
              {Array.from({ length: 35 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Ward {i + 1}
                </option>
              ))}
            </select>
            {errors.ward && (
              <p className="text-red-400 text-sm mt-1">{errors.ward}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Area/Tole
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg p-3"
              value={formData.tole}
              onChange={(e) => updateFormData({ tole: e.target.value })}
              placeholder="e.g., Kaushaltar, Gatthaghar, Lokanthali"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Postal Code
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg p-3"
              value={formData.postalCode}
              onChange={(e) => updateFormData({ postalCode: e.target.value })}
              placeholder="44600"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Street Address
          </label>
          <textarea
            className="w-full border border-gray-300 rounded-lg p-3 h-24"
            value={formData.streetAddress}
            onChange={(e) => updateFormData({ streetAddress: e.target.value })}
            placeholder="Enter detailed street address"
          />
        </div>
      </div>
    );
  };

  const renderPrincipalStep = () => {
    const errors = stepErrors[2] || {};

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Principal Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={`w-full border rounded-lg p-3 ${
                errors.principalName ? "border-red-400" : "border-gray-300"
              }`}
              value={formData.principalName}
              onChange={(e) =>
                updateFormData({ principalName: e.target.value })
              }
              placeholder="Enter principal's full name"
            />
            {errors.principalName && (
              <p className="text-red-500 text-sm mt-1">
                {errors.principalName}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Principal Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              className={`w-full border rounded-lg p-3 ${
                errors.principalPhone ? "border-red-400" : "border-gray-300"
              }`}
              value={formData.principalPhone}
              onChange={(e) =>
                updateFormData({ principalPhone: e.target.value })
              }
              placeholder="98xxxxxxxx"
            />
            {errors.principalPhone && (
              <p className="text-red-500 text-sm mt-1">
                {errors.principalPhone}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alternate Phone
            </label>
            <input
              type="tel"
              className="w-full border border-gray-300 rounded-lg p-3"
              value={formData.alternatePhone}
              onChange={(e) =>
                updateFormData({ alternatePhone: e.target.value })
              }
              placeholder="01xxxxxxx"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderLoginStep = () => {
    const errors = stepErrors[3] || {};

    return (
      <div className="space-y-6">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
          <p className="text-sm text-emerald-300">
            <strong>Login Email:</strong>{" "}
            {formData.schoolEmail || "Please complete School Info step"}
          </p>
          <p className="text-xs text-emerald-400 mt-1">
            Your school email from Step 1 will be used for login
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              className={`w-full border rounded-lg p-3 ${
                errors.password ? "border-red-400" : "border-gray-300"
              }`}
              value={formData.password}
              onChange={(e) => updateFormData({ password: e.target.value })}
              placeholder="Enter secure password"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
            <p className="text-gray-500 text-sm mt-1">
              Min 8 chars, include letter & number
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              className={`w-full border rounded-lg p-3 ${
                errors.confirmPassword ? "border-red-400" : "border-gray-300"
              }`}
              value={formData.confirmPassword}
              onChange={(e) =>
                updateFormData({ confirmPassword: e.target.value })
              }
              placeholder="Confirm password"
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">
                {errors.confirmPassword}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Website (Optional)
          </label>
          <input
            type="url"
            className="w-full border border-gray-300 rounded-lg p-3"
            value={formData.website}
            onChange={(e) => updateFormData({ website: e.target.value })}
            placeholder="https://schoolname.edu.np"
          />
        </div>
      </div>
    );
  };

  const renderEducationStep = () => {
    const errors = stepErrors[4] || {};

    return (
      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">
            Education Levels Offered
          </h3>
          {errors.educationLevels && (
            <p className="text-red-400 text-sm mb-4">
              {errors.educationLevels}
            </p>
          )}
          <p className="text-slate-300 mb-6">
            Select the education levels your school provides (you can select
            multiple)
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                key: "school",
                label: "School Level",
                desc: "Primary & Secondary",
                color: "blue",
              },
              {
                key: "highSchool",
                label: "High School",
                desc: "Grade 11-12",
                color: "green",
              },
              {
                key: "bachelor",
                label: "Bachelor Level",
                desc: "Degree Programs",
                color: "purple",
              },
            ].map((level) => (
              <div
                key={level.key}
                className={`border-2 rounded-lg p-4 transition-all ${
                  formData.educationLevels[level.key]
                    ? level.color === "blue"
                      ? "border-blue-400 bg-blue-500/20 text-blue-200"
                      : level.color === "green"
                      ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                      : "border-purple-400 bg-purple-500/20 text-purple-200"
                    : "border-slate-600 bg-slate-800 hover:border-slate-500"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-white">{level.label}</h4>
                    <p className="text-sm text-slate-300">{level.desc}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleEducationLevelChange(level.key)}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-all ${
                    formData.educationLevels[level.key]
                      ? level.color === "blue"
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : level.color === "green"
                        ? "bg-emerald-500 text-white hover:bg-emerald-600"
                        : "bg-purple-500 text-white hover:bg-purple-600"
                      : "bg-slate-700 text-white hover:bg-slate-600"
                  }`}
                >
                  {formData.educationLevels[level.key] ? "Selected" : "Choose"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {formData.educationLevels.school && (
          <div className="bg-blue-500/20 border border-blue-400 rounded-lg p-6">
            <h4 className="text-md font-medium text-white mb-4">
              School Level Configuration
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Lower Grade <span className="text-red-400">*</span>
                </label>
                <select
                  className="w-full border border-slate-600 bg-slate-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.schoolConfig.schoolLevel?.minGrade || 1}
                  onChange={(e) =>
                    updateFormData({
                      schoolConfig: {
                        ...formData.schoolConfig,
                        schoolLevel: {
                          ...formData.schoolConfig.schoolLevel,
                          minGrade: parseInt(e.target.value),
                        },
                      },
                    })
                  }
                >
                  <option value={1}>Grade 1</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Upper Grade <span className="text-red-400">*</span>
                </label>
                <select
                  className="w-full border border-slate-600 bg-slate-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.schoolConfig.schoolLevel?.maxGrade || 10}
                  onChange={(e) =>
                    updateFormData({
                      schoolConfig: {
                        ...formData.schoolConfig,
                        schoolLevel: {
                          ...formData.schoolConfig.schoolLevel,
                          maxGrade: parseInt(e.target.value),
                        },
                      },
                    })
                  }
                >
                  {[5, 6, 7, 8, 9, 10].map((grade) => (
                    <option key={grade} value={grade}>
                      Grade {grade}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-sm text-blue-200 mt-2">
              Your school will offer classes from{" "}
              {formData.schoolConfig.schoolLevel?.minGrade || 1} to{" "}
              {formData.schoolConfig.schoolLevel?.maxGrade || 10}
            </p>
          </div>
        )}

        {formData.educationLevels.highSchool && (
          <div className="bg-emerald-500/20 border border-emerald-400 rounded-lg p-6">
            <h4 className="text-md font-medium text-white mb-3">
              High School Configuration
            </h4>
            <p className="text-sm text-emerald-200 mb-4">
              High School automatically includes Grade 11 and Grade 12. Total: 2 Classes
            </p>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-emerald-900/30 rounded p-4">
                <span className="text-sm font-medium text-emerald-200">Lowest Grade</span>
                <p className="text-2xl font-bold text-emerald-300 mt-1">Grade 11</p>
              </div>
              <div className="bg-emerald-900/30 rounded p-4">
                <span className="text-sm font-medium text-emerald-200">Highest Grade</span>
                <p className="text-2xl font-bold text-emerald-300 mt-1">Grade 12</p>
              </div>
              <div className="bg-emerald-900/30 rounded p-4">
                <span className="text-sm font-medium text-emerald-200">Total Classes</span>
                <p className="text-2xl font-bold text-emerald-300 mt-1">2</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Faculty/Stream Offered
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="e.g., Science, Management, Humanities, Computer Science"
                  className="w-full border border-slate-600 bg-slate-700 text-white placeholder-slate-400 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  value={formData.schoolConfig.highSchool?.faculties || ""}
                  onChange={(e) =>
                    updateFormData({
                      schoolConfig: {
                        ...formData.schoolConfig,
                        highSchool: {
                          ...formData.schoolConfig.highSchool,
                          faculties: normalizeFaculties(e.target.value),
                        },
                      },
                    })
                  }
                />
                <p className="text-xs text-emerald-300">
                  Enter the streams/faculties your high school offers (separate
                  multiple with commas)
                </p>
              </div>
            </div>
          </div>
        )}

        {formData.educationLevels.bachelor && (
          <div className="bg-purple-500/20 border border-purple-400 rounded-lg p-6">
            <h4 className="text-md font-medium text-white mb-3">
              Bachelor Level Configuration
            </h4>
            <p className="text-sm text-purple-200 mb-4">
              Configure degree programs, duration, and faculties
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Lower Grade (Starting Year) <span className="text-red-400">*</span>
                </label>
                <select
                  className="w-full border border-slate-600 bg-slate-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  value={formData.schoolConfig.bachelor?.startingYear || 1}
                  onChange={(e) =>
                    updateFormData({
                      schoolConfig: {
                        ...formData.schoolConfig,
                        bachelor: {
                          ...formData.schoolConfig.bachelor,
                          startingYear: parseInt(e.target.value),
                        },
                      },
                    })
                  }
                >
                  <option value={1}>1st Year</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Upper Grade (Ending Year) <span className="text-red-400">*</span>
                </label>
                <select
                  className="w-full border border-slate-600 bg-slate-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  value={formData.schoolConfig.bachelor?.endingYear || 4}
                  onChange={(e) =>
                    updateFormData({
                      schoolConfig: {
                        ...formData.schoolConfig,
                        bachelor: {
                          ...formData.schoolConfig.bachelor,
                          endingYear: parseInt(e.target.value),
                        },
                      },
                    })
                  }
                >
                  <option value={2}>2nd Year</option>
                  <option value={3}>3rd Year</option>
                  <option value={4}>4th Year</option>
                </select>
              </div>
            </div>

            <div className="bg-purple-900/30 rounded p-4 mb-6">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="hasSemesters"
                  className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500 focus:ring-2"
                  checked={formData.schoolConfig.bachelor?.hasSemesters || false}
                  onChange={(e) =>
                    updateFormData({
                      schoolConfig: {
                        ...formData.schoolConfig,
                        bachelor: {
                          ...formData.schoolConfig.bachelor,
                          hasSemesters: e.target.checked,
                        },
                      },
                    })
                  }
                />
                <label htmlFor="hasSemesters" className="text-white font-medium">
                  Include Semester Division
                </label>
              </div>
              {formData.schoolConfig.bachelor?.hasSemesters && (
                <div className="text-sm text-purple-300 mt-3 space-y-1">
                  <p>
                    Duration: <strong>{(formData.schoolConfig.bachelor?.endingYear || 4) - (formData.schoolConfig.bachelor?.startingYear || 1) + 1} Years</strong>
                  </p>
                  <p>
                    Total Semesters: <strong>{((formData.schoolConfig.bachelor?.endingYear || 4) - (formData.schoolConfig.bachelor?.startingYear || 1) + 1) * 2} Semesters</strong>
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Faculties/Programs Offered
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="e.g., BCA, BIT, BSc Computer Science, BBA, MBA, Engineering, etc."
                  className="w-full border border-slate-600 bg-slate-700 text-white placeholder-slate-400 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  value={formData.schoolConfig.bachelor?.faculties || ""}
                  onChange={(e) =>
                    updateFormData({
                      schoolConfig: {
                        ...formData.schoolConfig,
                        bachelor: {
                          ...formData.schoolConfig.bachelor,
                          faculties: normalizeFaculties(e.target.value),
                        },
                      },
                    })
                  }
                />
                <p className="text-xs text-purple-300">
                  Enter the degree programs your institution offers (separate
                  multiple with commas)
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderThemeStep = () => {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">
            School Theme Colors
          </h3>
          <p className="text-slate-300 mb-6">
            Choose colors that represent your school's identity
          </p>

          <div className="mb-6">
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="themeChoice"
                  className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 focus:ring-emerald-500 focus:ring-2"
                  checked={formData.useDefaultTheme || false}
                  onChange={() =>
                    updateFormData({
                      useDefaultTheme: true,
                      primaryColor: "#10b981",
                      secondaryColor: "#6b7280",
                    })
                  }
                />
                <span className="text-white font-medium">
                  Use Default Theme Colors
                </span>
              </label>
              <p className="text-slate-400 text-sm ml-7">
                Keep the professional dark theme with emerald accents
              </p>

              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="themeChoice"
                  className="w-4 h-4 text-emerald-600 bg-slate-700 border-slate-600 focus:ring-emerald-500 focus:ring-2"
                  checked={!formData.useDefaultTheme}
                  onChange={() => updateFormData({ useDefaultTheme: false })}
                />
                <span className="text-white font-medium">
                  Choose Custom Colors
                </span>
              </label>
              <p className="text-slate-400 text-sm ml-7">
                Customize colors to match your school's branding
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Primary Color <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                className="w-16 h-12 border border-slate-600 bg-slate-700 rounded-lg cursor-pointer"
                value={formData.primaryColor}
                onChange={(e) =>
                  updateFormData({ primaryColor: e.target.value })
                }
                disabled={formData.useDefaultTheme}
              />
              <input
                type="text"
                className="flex-1 border border-slate-600 bg-slate-700 text-white placeholder-slate-400 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={formData.primaryColor}
                onChange={(e) =>
                  updateFormData({ primaryColor: e.target.value })
                }
                placeholder="#10b981"
                disabled={formData.useDefaultTheme}
              />
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Used for headers, buttons, and main branding
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Secondary Color (Optional)
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                className="w-16 h-12 border border-slate-600 bg-slate-700 rounded-lg cursor-pointer"
                value={formData.secondaryColor || "#6B7280"}
                onChange={(e) =>
                  updateFormData({ secondaryColor: e.target.value })
                }
                disabled={formData.useDefaultTheme}
              />
              <input
                type="text"
                className="flex-1 border border-slate-600 bg-slate-700 text-white placeholder-slate-400 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={formData.secondaryColor}
                onChange={(e) =>
                  updateFormData({ secondaryColor: e.target.value })
                }
                placeholder="#6b7280"
                disabled={formData.useDefaultTheme}
              />
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Used for accents and secondary elements
            </p>
          </div>
        </div>

        <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
          <h4 className="font-medium text-white mb-3">Color Preview</h4>
          <div className="flex items-center space-x-4">
            <div
              className="w-20 h-12 rounded-lg border border-slate-500"
              style={{ backgroundColor: formData.primaryColor }}
            ></div>
            <span className="text-sm text-slate-300">Primary</span>
            {formData.secondaryColor && (
              <>
                <div
                  className="w-20 h-12 rounded-lg border border-slate-500"
                  style={{ backgroundColor: formData.secondaryColor }}
                ></div>
                <span className="text-sm text-slate-300">Secondary</span>
              </>
            )}
          </div>
          {formData.useDefaultTheme && (
            <p className="text-emerald-400 text-sm mt-3">
              ✓ Using default professional theme
            </p>
          )}
        </div>
      </div>
    );
  };

  const getCurrentStepComponent = () => {
    switch (currentStep) {
      case 0:
        return renderBasicInfoStep();
      case 1:
        return renderLocationStep();
      case 2:
        return renderPrincipalStep();
      case 3:
        return renderLoginStep();
      case 4:
        return renderEducationStep();
      case 5:
        return renderThemeStep();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            School Registration
          </h1>
          <p className="text-slate-300">
            Join our platform to manage your school efficiently - Step{" "}
            {currentStep + 1} of {STEPS.length}
          </p>
        </div>

        <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-700">
          <div className="p-6 border-b border-slate-700">
            <ProgressIndicator
              currentStep={currentStep}
              totalSteps={STEPS.length}
              stepLabels={STEPS.map((step) => step.title)}
              onStepClick={handleStepClick}
              completedSteps={completedSteps}
            />
          </div>

          <div className="p-8">
            <div className="flex items-center mb-6">
              {React.createElement(STEPS[currentStep].icon, {
                className: "h-8 w-8 text-emerald-400 mr-3",
              })}
              <div>
                <h2 className="text-2xl font-semibold text-white">
                  {STEPS[currentStep].title}
                </h2>
                <p className="text-slate-300 mt-1">
                  {currentStep === 0 &&
                    "Enter basic school information and contact details"}
                  {currentStep === 1 &&
                    "Provide your school's location details"}
                  {currentStep === 2 && "Enter principal information"}
                  {currentStep === 3 && "Set up login password"}
                  {currentStep === 4 &&
                    "Configure education levels and grade ranges"}
                  {currentStep === 5 && "Customize your school's theme colors"}
                </p>
              </div>
            </div>

            {stepErrors[currentStep]?.submit && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6">
                {stepErrors[currentStep].submit}
              </div>
            )}

            <div className="min-h-[400px]">{getCurrentStepComponent()}</div>
          </div>

          <div className="px-8 py-6 bg-slate-900 border-t border-slate-700 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                type="button"
                className="text-slate-400 hover:text-slate-200 transition-colors text-sm"
                onClick={() => router.push("/login")}
              >
                ← Back to Login
              </button>
            </div>

            <div className="flex items-center space-x-4">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="px-6 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                  disabled={loading}
                >
                  Previous
                </button>
              )}

              <button
                type="button"
                onClick={
                  currentStep === STEPS.length - 1 ? handleSubmit : handleNext
                }
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </div>
                ) : currentStep === STEPS.length - 1 ? (
                  "Complete Registration"
                ) : (
                  "Next Step"
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-slate-400 text-sm">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-emerald-400 hover:text-emerald-300 font-medium"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
