// Tests for the zod validation machinery in lib/validation.js.
//
// This layer existed but was imported by nothing, so nobody had noticed that
// zod 4 renamed `ZodError.errors` to `.issues`. Reading the old name threw a
// TypeError inside the catch block, meaning the FIRST invalid payload any route
// received would have produced a 500 instead of a 400.
import { z } from "zod";
import { validateWithZod, validateRequestBody } from "@/lib/validation";

const schema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  count: z.number().int(),
});

function jsonRequest(body) {
  return { json: async () => body };
}

describe("validateWithZod", () => {
  it("returns the parsed data when valid", async () => {
    const result = await validateWithZod(schema, { title: "Quiz", count: 2 });
    expect(result).toEqual({ success: true, data: { title: "Quiz", count: 2 } });
  });

  it("reports field-level errors instead of throwing (the zod 4 regression)", async () => {
    const result = await validateWithZod(schema, { title: "no", count: 1.5 });

    expect(result.success).toBe(false);
    expect(result.errors.map((e) => e.field).sort()).toEqual(["count", "title"]);
    expect(result.errors.find((e) => e.field === "title").message).toBe(
      "Title must be at least 3 characters"
    );
  });

  it("names the root when the failure is not on a field", async () => {
    const result = await validateWithZod(z.string(), 42);
    expect(result.success).toBe(false);
    expect(result.errors[0].field).toBe("root");
  });

  it("reports nested paths with dots", async () => {
    const nested = z.object({ meta: z.object({ tag: z.string() }) });
    const result = await validateWithZod(nested, { meta: { tag: 5 } });
    expect(result.errors[0].field).toBe("meta.tag");
  });
});

describe("validateRequestBody", () => {
  it("returns data and no error for a valid body", async () => {
    const { data, error } = await validateRequestBody(
      schema,
      jsonRequest({ title: "Quiz", count: 2 })
    );

    expect(error).toBeUndefined();
    expect(data).toEqual({ title: "Quiz", count: 2 });
  });

  it("returns a ready-to-send 400 for an invalid body", async () => {
    const { data, error } = await validateRequestBody(
      schema,
      jsonRequest({ title: "no", count: 1 })
    );

    expect(data).toBeUndefined();
    expect(error.status).toBe(400);

    const payload = await error.json();
    expect(payload).toMatchObject({ success: false, code: "VALIDATION_ERROR" });
    expect(payload.details[0].field).toBe("title");
  });

  it("treats a non-JSON body as a 400, not a crash", async () => {
    const broken = {
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    };

    const { error } = await validateRequestBody(schema, broken);
    expect(error.status).toBe(400);
    await expect(error.json()).resolves.toMatchObject({
      success: false,
      code: "VALIDATION_ERROR",
    });
  });
});
