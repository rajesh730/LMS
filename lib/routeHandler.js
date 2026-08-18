/**
 * The route wrapper — one place that owns the delivery-layer plumbing.
 *
 * Every handler in `app/api/**` currently repeats the same four things by hand:
 * connect to the database, gate the session, wrap the body in `try/catch`, and
 * turn an unexpected throw into a 500. That is 149 hand-written `try/catch`
 * blocks and 233 `console.error` calls, each free to be subtly different — and
 * they are: 567 raw `NextResponse.json` returns against 73 `internalServerError`.
 *
 * `defineRoute` removes that repetition, so a handler contains only what is
 * actually specific to it:
 *
 *   export const GET = defineRoute({ roles: ["SCHOOL_ADMIN"] }, async ({ session }) => {
 *     const notices = await listNotices(session.user.id);
 *     return successResponse(200, "Notices loaded", { notices });
 *   });
 *
 * It also finally activates `APIError`, which has existed in `lib/apiResponse.js`
 * with zero usages. A domain function deep in `lib/` can now throw
 * `new APIError("Notice not found", 404, "NOT_FOUND")` and get the right status
 * at the boundary, instead of routes threading `{ error }` objects back up by
 * hand.
 *
 * Response shapes are NOT changed here. This wrapper standardizes the error and
 * plumbing paths only; converting success payloads to the envelope is deviation
 * D2 and must still be done per resource with its consumers.
 */
import connectDB from "@/lib/db";
import { requireApiSession } from "@/lib/authz";
import { APIError, errorResponse, internalServerError } from "@/lib/apiResponse";

/**
 * @param {object} options
 * @param {string[]|null} [options.roles]
 *   Roles allowed to call this route. `[]` means "any signed-in user".
 *   Omit or pass `null` for a PUBLIC route — no session is required or fetched.
 *   Being explicit matters: a missing gate is the one mistake here that is
 *   silent, so public access must be stated rather than defaulted into.
 * @param {boolean} [options.connect=true]
 *   Connect to MongoDB before the handler runs. Leave on unless the route
 *   genuinely touches no model.
 * @param {string} [options.errorMessage]
 *   Message for the 500 when something unexpected throws.
 * @param {(ctx: object) => Promise<Response>} handler
 *   Receives `{ request, context, params, session }` and returns a Response.
 */
export function defineRoute(options, handler) {
  const {
    roles = null,
    connect = true,
    errorMessage = "An unexpected error occurred",
  } = options || {};

  return async function routeHandler(request, context) {
    try {
      let session = null;

      // Gate before connecting: an unauthenticated caller should never cost a
      // database round trip, which on this cluster is ~69ms (§9).
      if (roles !== null) {
        const { session: resolved, error } = await requireApiSession(roles);
        if (error) return error;
        session = resolved;
      }

      if (connect) await connectDB();

      // `params` is a promise in Next 16; resolve it once so handlers do not
      // each have to remember to await it.
      const params = context?.params ? await context.params : {};

      return await handler({ request, context, params, session });
    } catch (error) {
      // A deliberate, typed failure from anywhere in the call stack.
      if (error instanceof APIError) {
        return errorResponse(error.status, error.message, error.code);
      }

      console.error(
        `${request?.method || "?"} ${request?.url || "?"} failed:`,
        error
      );
      return internalServerError(errorMessage);
    }
  };
}

export default defineRoute;
