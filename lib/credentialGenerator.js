import crypto from "crypto";
import bcrypt from "bcryptjs";
import connectDB from "./db.js";
import Student from "../models/Student.js";

/**
 * Generate a secure random password
 * @param {number} length - Password length (default 16)
 * @returns {string} Random password
 */
export const generatePassword = (length = 16) => {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  const charsetLength = charset.length;
  let password = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charsetLength);
    password += charset[randomIndex];
  }

  return password;
};

/**
 * Generate username from first and last name
 * Format: firstname.lastname (with number suffix if duplicate exists)
 * @param {string} firstName - Student's first name
 * @param {string} lastName - Student's last name
 * @param {string} schoolId - School ObjectId to check uniqueness within school
 * @returns {Promise<string>} Unique username
 */
export const generateUsername = async (firstName, lastName, schoolId) => {
  if (!firstName || !lastName || !schoolId) {
    throw new Error("firstName, lastName, and schoolId are required");
  }

  await connectDB();

  let baseUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
  let username = baseUsername;
  let counter = 1;

  // Check for uniqueness within school
  while (true) {
    const existing = await Student.findOne({
      username,
      school: schoolId,
    });

    if (!existing) {
      return username;
    }

    // Add counter suffix if duplicate found
    counter++;
    username = `${baseUsername}${counter}`;
  }
};

/**
 * Hash password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare password with hashed version
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} Password match result
 */
export const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Generate complete student credentials object
 * @param {string} firstName - Student's first name
 * @param {string} lastName - Student's last name
 * @param {string} schoolId - School ObjectId
 * @returns {Promise<{username: string, password: string, hashedPassword: string}>}
 */
export const generateStudentCredentials = async (firstName, lastName, schoolId) => {
  try {
    const username = await generateUsername(firstName, lastName, schoolId);
    const password = generatePassword(16);
    const hashedPassword = await hashPassword(password);

    return {
      username,
      password, // Plain text for display to parent
      hashedPassword, // For storing in database
    };
  } catch (error) {
    throw new Error(`Failed to generate credentials: ${error.message}`);
  }
};
