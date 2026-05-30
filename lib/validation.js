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

// ========== Zod Schema Validation (Server-side) ==========
import { z } from 'zod';

const emailSchema = z.string().email('Invalid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const dateSchema = z.string().datetime().optional().or(z.date().optional());
const mongoIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ID');

// Event Validation Schemas
export const createEventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().optional(),
  capacity: z.number().int('Capacity must be an integer').positive('Capacity must be positive'),
  location: z.string().min(1, 'Location is required'),
  eventType: z.enum(['ONLINE', 'OFFLINE', 'HYBRID']),
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
  maxParticipants: z.number().int().positive().optional(),
});

export const updateEventSchema = createEventSchema.partial();

// Student Validation Schemas
export const createStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  email: emailSchema.optional(),
  parentEmail: z.string().email('Invalid parent email'),
  grade: z.string().min(1, 'Grade is required'),
  rollNumber: z.string().min(1, 'Roll number is required'),
  dateOfBirth: dateSchema,
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export const updateStudentSchema = createStudentSchema.partial();

export const bulkCreateStudentsSchema = z.array(
  z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    parentEmail: emailSchema,
    grade: z.string().min(1),
    rollNumber: z.string().min(1),
  })
);

// Teacher Validation Schemas
export const createTeacherSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: emailSchema,
  phone: z.string().optional(),
  qualification: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  address: z.string().optional(),
  dateOfJoining: dateSchema,
  designation: z.string().optional(),
  experience: z.number().nonnegative('Experience cannot be negative').optional(),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', '']).optional(),
  subject: z.string().min(1, 'Subject is required'),
  roles: z.array(z.string()).optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT']).optional(),
});

export const updateTeacherSchema = createTeacherSchema.partial();

// Notice Validation Schemas
export const createNoticeSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(500),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  type: z.enum(['GENERAL', 'URGENT', 'CLUB', 'EVENT', 'HOLIDAY', 'SHOWCASE']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  targetAudience: z.array(z.string()).optional(),
  scheduledFor: dateSchema,
});

export const updateNoticeSchema = createNoticeSchema.partial();

// School Settings Validation
export const updateSchoolSettingsSchema = z.object({
  schoolName: z.string().min(1).optional(),
  email: emailSchema.optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  principalName: z.string().optional(),
});

// Authentication Schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Support Ticket Validation
export const createSupportTicketSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});

export const updateSupportTicketSchema = z.object({
  action: z.enum(['reply', 'status', 'note']).optional(),
  message: z.string().min(1).optional(),
  status: z.enum(['pending', 'in-progress', 'resolved']).optional(),
  internalNote: z.string().optional(),
  sendNotification: z.boolean().optional(),
});

// Utility function to validate and return normalized data
export async function validateWithZod(schema, data) {
  try {
    const validated = await schema.parseAsync(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.') || 'root',
        message: err.message,
      }));
      return { success: false, errors: formattedErrors };
    }
    return { success: false, errors: [{ field: 'root', message: 'Validation failed' }] };
  }
}
