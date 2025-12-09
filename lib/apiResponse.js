import { NextResponse } from "next/server";

/**
 * Standardized API Response Utility
 * Ensures consistent error/success responses across all endpoints
 */

export class APIError extends Error {
  constructor(message, status = 400, code = "BAD_REQUEST") {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "APIError";
  }
}

export function successResponse(
  status = 200,
  message = "Success",
  data = null
) {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status }
  );
}

export function errorResponse(status = 400, message = "Error", code = "ERROR") {
  return NextResponse.json(
    {
      success: false,
      message,
      code,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

export function validationError(message, details = null) {
  return NextResponse.json(
    {
      success: false,
      message,
      code: "VALIDATION_ERROR",
      details,
      timestamp: new Date().toISOString(),
    },
    { status: 400 }
  );
}

export function unauthorizedError() {
  return NextResponse.json(
    {
      success: false,
      message:
        "Unauthorized: You do not have permission to access this resource",
      code: "UNAUTHORIZED",
      timestamp: new Date().toISOString(),
    },
    { status: 401 }
  );
}

export function notFoundError(resource = "Resource") {
  return NextResponse.json(
    {
      success: false,
      message: `${resource} not found`,
      code: "NOT_FOUND",
      timestamp: new Date().toISOString(),
    },
    { status: 404 }
  );
}

export function internalServerError(message = "An unexpected error occurred") {
  return NextResponse.json(
    {
      success: false,
      message,
      code: "INTERNAL_SERVER_ERROR",
      timestamp: new Date().toISOString(),
    },
    { status: 500 }
  );
}
