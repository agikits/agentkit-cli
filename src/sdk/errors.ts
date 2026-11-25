/** Error envelope returned by the v2 API: `{ error: { code, message, details? } }`. */
export type V2ErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

type FlatV2ErrorBody = { error: string; required?: unknown; interval?: unknown };

export class AgentkitError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: unknown;
  readonly requestId?: string;

  constructor(params: {
    code: string;
    message: string;
    status: number;
    details?: unknown;
    requestId?: string;
  }) {
    super(params.message);
    this.name = "AgentkitError";
    this.code = params.code;
    this.status = params.status;
    this.details = params.details;
    this.requestId = params.requestId;
  }
}

/** Bound successful and error bodies before JSON parsing. Cancels the upstream body on overflow. */
export async function readResponseText(response: Response, maxBytes = 16 * 1024 * 1024): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0, text = "";
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) return text + decoder.decode();
      bytes += part.value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new AgentkitError({ code: "RESPONSE_TOO_LARGE", message: "API response exceeds the configured byte limit.", status: response.status });
      }
      text += decoder.decode(part.value, { stream: true });
    }
  } finally { reader.releaseLock(); }
}

/** Build an AgentkitError from a non-OK Response, parsing the v2 envelope if present. */
export async function errorFromResponse(
  response: Response,
  maxBytes = 16 * 1024 * 1024,
): Promise<AgentkitError> {
  let body: V2ErrorBody | FlatV2ErrorBody | undefined;
  try {
    body = JSON.parse(await readResponseText(response, maxBytes)) as V2ErrorBody | FlatV2ErrorBody;
  } catch (error) {
    if (error instanceof AgentkitError) throw error;
    // non-JSON error body; fall back to status text
  }
  const requestId = response.headers.get("x-request-id") ?? undefined;
  if (typeof body?.error === "string") {
    const { error, required, interval } = body as FlatV2ErrorBody;
    const missingScope = response.status === 403 && error === "insufficient_scope" && typeof required === "string";
    return new AgentkitError({
      code: error,
      status: response.status,
      message: missingScope ? `This API key requires the ${required} scope for this operation.` : `HTTP ${response.status}: ${error}`,
      details: missingScope ? { required } : typeof interval === "number" ? { interval } : undefined,
      requestId,
    });
  }
  return new AgentkitError({
    code: body?.error?.code ?? `HTTP_${response.status}`,
    message: body?.error?.message ?? response.statusText ?? `HTTP ${response.status}`,
    status: response.status,
    details: body?.error?.details,
    requestId,
  });
}
