const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isCsrfSafe(request: Request): boolean {
  return SAFE_METHODS.has(request.method) ||
    request.headers.get("origin") === new URL(request.url).origin;
}
