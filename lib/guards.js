import SchoolConfig from "@/models/SchoolConfig";
import { NextResponse } from "next/server";

/**
 * Checks if the school has an active academic year.
 * @param {string} schoolId - The ID of the school (user ID of School Admin).
 * @returns {Promise<string|null>} - Returns the academic year ID if active, or throws an error if not.
 */
export async function validateActiveYear(schoolId) {
    const config = await SchoolConfig.findOne({ school: schoolId }).select('currentAcademicYear');
    
    if (!config || !config.currentAcademicYear) {
        throw new Error("NO_ACTIVE_YEAR");
    }
    
    return config.currentAcademicYear.toString();
}

/**
 * Helper to return a standardized error response for missing academic year.
 */
export function missingYearResponse() {
    return NextResponse.json(
        { message: "Action Failed: No Active Academic Year found. Please activate a year in Settings." },
        { status: 403 }
    );
}
