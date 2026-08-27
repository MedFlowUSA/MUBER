const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requestId(value?: string | null) {
  return value && uuid.test(value) ? value.toLowerCase() : crypto.randomUUID();
}
