const supabaseOrigin = (value?: string) => {
  try {
    const url = new URL(value || "");
    return url.protocol === "https:" ? url.origin : "";
  } catch {
    return "";
  }
};

export function securityHeaders(
  env: Record<string, string | undefined> = process.env,
) {
  const supabase = supabaseOrigin(env.NEXT_PUBLIC_SUPABASE_URL);
  const sources = supabase ? ` ${supabase}` : "";
  const policy = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `connect-src 'self'${sources} https://vercel.live wss://ws-us3.pusher.com`,
    `img-src 'self' data: blob:${sources}`,
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline' https://vercel.live",
    "frame-src https://vercel.live",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ].join("; ");
  return [
    { key: "Content-Security-Policy", value: policy },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    {
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    },
  ];
}
