/**
 * Form Validation Utilities
 * Provides client-side and server-side validation functions
 */

export const VALIDATION_RULES = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: /^(?=.*[A-Za-z])(?=.*\d).{8,}$/,
  phone: /^[\d\s\-\+\(\)]{10,}$/,
  url: /^https?:\/\/.+\..+/,
  name: /^[a-zA-Z\s]{2,}$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  rollNumber: /^[a-zA-Z0-9\-]{1,20}$/,
};

export const validateEmail = (email) => {
  if (!email) return "Email is required";
  if (!VALIDATION_RULES.email.test(email)) return "Invalid email format";
  return null;
};

export const validatePassword = (password) => {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!VALIDATION_RULES.password.test(password)) {
    return "Password must contain at least one letter and one number";
  }
  return null;
};

export const validateName = (name) => {
  if (!name || name.trim().length < 2)
    return "Name must be at least 2 characters";
  return null;
};

export const validatePhone = (phone) => {
  if (!phone) return "Phone is required";
  if (!VALIDATION_RULES.phone.test(phone)) return "Invalid phone format";
  return null;
};

export const validateRollNumber = (rollNumber) => {
  if (!rollNumber) return "Roll number is required";
  if (rollNumber.length > 20) return "Roll number is too long";
  return null;
};

export const validateUrl = (url) => {
  if (!url) return "URL is required";
  if (!VALIDATION_RULES.url.test(url)) return "Invalid URL format";
  return null;
};

export const validateFile = (file, options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024,
    allowedTypes = ["text/csv", "application/vnd.ms-excel"],
  } = options;

  if (!file) return "File is required";
  if (file.size > maxSize)
    return `File must be smaller than ${maxSize / 1024 / 1024}MB`;
  if (!allowedTypes.includes(file.type) && !file.name.endsWith(".csv")) {
    return "Only CSV files are allowed";
  }
  return null;
};

export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === "string" && value.trim().length === 0)) {
    return `${fieldName} is required`;
  }
  return null;
};

export const validateForm = (formData, rules) => {
  const errors = {};

  for (const [field, rule] of Object.entries(rules)) {
    const value = formData[field];
    let error = null;

    if (rule.required && !value) {
      error = `${rule.label || field} is required`;
    } else if (value && rule.validator) {
      error = rule.validator(value);
    }

    if (error) {
      errors[field] = error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove angle brackets to prevent basic XSS
    .substring(0, 255); // Limit length
};
