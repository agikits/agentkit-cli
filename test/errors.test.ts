import { describe, expect, it } from "vitest";

import { AgentkitError, errorFromResponse } from "../src/sdk/errors.js";

describe("errorFromResponse", () => {
  it("maps the v2 error envelope", async () => {
    const response = new Response(
      JSON.stringify({
        error: {
          code: "SUBSCRIPTION_PLAN_REQUIRED",
          message: "API access requires a Hobby plan or above",
          details: { plan: "free" },
        },
      }),
      { status: 403, headers: { "content-type": "application/json" } },
    );
    const err = await errorFromResponse(response);
    expect(err).toBeInstanceOf(AgentkitError);
    expect(err.code).toBe("SUBSCRIPTION_PLAN_REQUIRED");
    expect(err.status).toBe(403);
    expect(err.details).toEqual({ plan: "free" });
  });

  it("falls back to HTTP status on a non-JSON body", async () => {
    const response = new Response("nope", { status: 502 });
    const err = await errorFromResponse(response);
    expect(err.code).toBe("HTTP_502");
    expect(err.status).toBe(502);
  });
});
