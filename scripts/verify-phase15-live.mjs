import crypto from "node:crypto";

if (process.env.RUN_LIVE_E2E !== "1")
  throw new Error("Set RUN_LIVE_E2E=1 to run live verification");
const base = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  site = process.env.E2E_SITE_URL;
if (!base || !key || !site)
  throw new Error("Missing browser-safe Supabase configuration");
const deployment = new URL(site);
if (deployment.protocol !== "https:")
  throw new Error("E2E_SITE_URL must use HTTPS");
const callback = new URL("/auth/callback", deployment).toString();
const resetRoute = new URL("/auth/reset", deployment).toString();
const results = [];
const assert = (name, value) => {
  if (!value) throw new Error(`FAILED: ${name}`);
  results.push(name);
};
const json = async (url, options = {}) => {
  const r = await fetch(url, options);
  const text = await r.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { r, body };
};
const apiHeaders = (token) => ({
  apikey: key,
  Authorization: `Bearer ${token}`,
  "content-type": "application/json",
});
async function mailbox() {
  const domains = await json("https://api.mail.tm/domains");
  const domain = domains.body["hydra:member"].find((x) => x.isActive)?.domain;
  const password = crypto.randomBytes(24).toString("base64url");
  const address = `muber-e2e-${crypto.randomUUID()}@${domain}`;
  const account = await json("https://api.mail.tm/accounts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address, password }),
  });
  if (!account.r.ok) throw new Error("Disposable inbox creation failed");
  const login = await json("https://api.mail.tm/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address, password }),
  });
  return { address, password, id: account.body.id, token: login.body.token };
}
async function waitForMessage(box, subject, timeout = 90000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const list = await json("https://api.mail.tm/messages", {
      headers: { Authorization: `Bearer ${box.token}` },
    });
    const match = list.body["hydra:member"]?.find((x) =>
      x.subject?.toLowerCase().includes(subject),
    );
    if (match)
      return (
        await json(`https://api.mail.tm/messages/${match.id}`, {
          headers: { Authorization: `Bearer ${box.token}` },
        })
      ).body;
    await new Promise((r) => setTimeout(r, 2500));
  }
  throw new Error(`Timed out waiting for ${subject} email`);
}
const boxes = [];
async function customer() {
  const box = await mailbox();
  // Register the mailbox for cleanup immediately. Certification can fail at
  // any later assertion, including before this function returns a customer.
  boxes.push(box);
  const password = crypto.randomBytes(24).toString("base64url") + "A1!";
  const signup = await json(
    `${base}/auth/v1/signup?redirect_to=${encodeURIComponent(callback)}`,
    {
      method: "POST",
      headers: { apikey: key, "content-type": "application/json" },
      body: JSON.stringify({
        email: box.address,
        password,
        data: { full_name: "MUBER E2E Customer" },
      }),
    },
  );
  if (!signup.r.ok)
    throw new Error(
      `Registration rejected (${signup.r.status}): ${signup.body?.error_code || signup.body?.code || signup.body?.msg || signup.body?.message || "unknown"}`,
    );
  assert("registration accepted", Boolean(signup.body.id || signup.body.user));
  let access = signup.body.access_token || signup.body.session?.access_token,
    refresh = signup.body.refresh_token || signup.body.session?.refresh_token;
  if (process.env.E2E_AUTOCONFIRM !== "1") {
    const mail = await waitForMessage(box, "confirm");
    const content = [mail.text, ...(mail.html || [])]
      .join(" ")
      .replaceAll("&amp;", "&");
    const links = content.match(/https?:\/\/[^\s"'<>]+/g) || [];
    const verify = links.find((x) => x.includes("supabase.co/auth/v1/verify"));
    if (!verify) throw new Error("Verification link not found");
    const verified = await fetch(verify, { redirect: "manual" });
    const location = verified.headers.get("location") || "";
    assert(
      "email verification redirect is approved",
      location.startsWith(callback),
    );
    const fragment = new URL(location).hash.slice(1);
    const params = new URLSearchParams(fragment);
    access = params.get("access_token");
    refresh = params.get("refresh_token");
  } else {
    assert("temporary auto-confirm session issued", Boolean(access && refresh));
  }
  if (!access) {
    const login = await json(`${base}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: key, "content-type": "application/json" },
      body: JSON.stringify({ email: box.address, password }),
    });
    access = login.body.access_token;
    refresh = login.body.refresh_token;
  }
  assert("verified customer login", Boolean(access && refresh));
  const restored = await json(
    `${base}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: { apikey: key, "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    },
  );
  assert("session restoration", restored.r.ok && restored.body.access_token);
  return {
    ...box,
    password,
    access: restored.body.access_token,
    refresh: restored.body.refresh_token,
    userId: restored.body.user.id,
  };
}
async function cleanup(box) {
  await fetch(`https://api.mail.tm/accounts/${box.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${box.token}` },
  });
}
try {
  const a = await customer();
  const b = await customer();
  assert("two independent verified customers", a.userId !== b.userId);
  const payload = {
    service: "remove",
    pickup: "Synthetic test location",
    destination: "",
    date: "2026-09-15",
    timeWindow: "Morning",
    description: "Synthetic disposable Phase 1.5 verification request",
    access: "Ground level",
    categories: ["Furniture"],
    name: "MUBER E2E Customer",
    email: a.address,
    phone: "9095550100",
    stops: [{ line1: "Synthetic test location", order: 0, type: "service" }],
    items: ["Furniture"],
  };
  const created = await json(`${base}/rest/v1/rpc/submit_customer_booking`, {
    method: "POST",
    headers: apiHeaders(a.access),
    body: JSON.stringify({
      p_payload: payload,
      p_idempotency_key: crypto.randomUUID(),
    }),
  });
  assert("atomic booking creation", created.r.ok && created.body?.[0]?.job_id);
  const job = created.body[0];
  const repeatedKey = crypto.randomUUID();
  const first = await json(`${base}/rest/v1/rpc/submit_customer_booking`, {
    method: "POST",
    headers: apiHeaders(a.access),
    body: JSON.stringify({
      p_payload: payload,
      p_idempotency_key: repeatedKey,
    }),
  });
  const repeat = await json(`${base}/rest/v1/rpc/submit_customer_booking`, {
    method: "POST",
    headers: apiHeaders(a.access),
    body: JSON.stringify({
      p_payload: payload,
      p_idempotency_key: repeatedKey,
    }),
  });
  assert(
    "duplicate submission prevention",
    first.r.ok && repeat.r.ok && first.body[0].job_id === repeat.body[0].job_id,
  );
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  const path = `${a.userId}/${job.job_id}/${crypto.randomUUID()}.png`;
  const upload = await fetch(`${base}/storage/v1/object/job-media/${path}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${a.access}`,
      "content-type": "image/png",
      "x-upsert": "false",
    },
    body: png,
  });
  assert("authenticated private upload", upload.ok);
  const media = await json(`${base}/rest/v1/rpc/register_job_media`, {
    method: "POST",
    headers: apiHeaders(a.access),
    body: JSON.stringify({
      p_job: job.job_id,
      p_path: path,
      p_mime: "image/png",
      p_size: png.length,
    }),
  });
  assert("private media registration", media.r.ok);
  const ownJob = await json(
    `${base}/rest/v1/jobs?id=eq.${job.job_id}&select=id`,
    { headers: apiHeaders(a.access) },
  );
  const ownEvents = await json(
    `${base}/rest/v1/job_status_events?job_id=eq.${job.job_id}&select=id,status`,
    { headers: apiHeaders(a.access) },
  );
  assert(
    "customer A reads own job and initial event",
    ownJob.body.length === 1 && ownEvents.body.length === 1,
  );
  const signed = await json(
    `${base}/storage/v1/object/sign/job-media/${path}`,
    {
      method: "POST",
      headers: apiHeaders(a.access),
      body: JSON.stringify({ expiresIn: 60 }),
    },
  );
  assert(
    "authorized signed image retrieval",
    signed.r.ok && signed.body.signedURL,
  );
  const posted = await json(`${base}/rest/v1/rpc/post_job_message`, {
    method: "POST",
    headers: apiHeaders(a.access),
    body: JSON.stringify({
      p_job: job.job_id,
      p_channel: "customer_dispatch",
      p_body: "Synthetic certification conversation message",
      p_request_id: crypto.randomUUID(),
    }),
  });
  assert(
    "customer A posts owned conversation message",
    posted.r.ok && posted.body,
  );
  const ownMessages = await json(`${base}/rest/v1/rpc/get_job_messages_page`, {
    method: "POST",
    headers: apiHeaders(a.access),
    body: JSON.stringify({ p_job: job.job_id, p_page: 1, p_page_size: 50 }),
  });
  assert(
    "customer A reads owned conversation",
    ownMessages.r.ok && ownMessages.body.length === 1,
  );
  const attachmentPath = `${a.userId}/${job.job_id}/${crypto.randomUUID()}.png`;
  const attachmentUpload = await fetch(
    `${base}/storage/v1/object/conversation-attachments/${attachmentPath}`,
    {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${a.access}`,
        "content-type": "image/png",
        "x-upsert": "false",
      },
      body: png,
    },
  );
  assert(
    "customer A uploads private conversation attachment",
    attachmentUpload.ok,
  );
  const attachment = await json(
    `${base}/rest/v1/rpc/post_job_message_attachment`,
    {
      method: "POST",
      headers: apiHeaders(a.access),
      body: JSON.stringify({
        p_job: job.job_id,
        p_channel: "customer_dispatch",
        p_body: "Synthetic private attachment",
        p_path: attachmentPath,
        p_mime: "image/png",
        p_size: png.length,
        p_request_id: crypto.randomUUID(),
      }),
    },
  );
  assert(
    "customer A registers private conversation attachment",
    attachment.r.ok && attachment.body,
  );
  for (const [table, query] of [
    ["profiles", `id=eq.${a.userId}`],
    ["customers", `profile_id=eq.${a.userId}`],
    ["jobs", `id=eq.${job.job_id}`],
    ["job_status_events", `job_id=eq.${job.job_id}`],
    ["job_media", `job_id=eq.${job.job_id}`],
    ["quote_versions", `job_id=eq.${job.job_id}`],
    ["job_information_requests", `job_id=eq.${job.job_id}`],
    ["job_information_responses", `job_id=eq.${job.job_id}`],
    ["completion_submissions", `job_id=eq.${job.job_id}`],
    ["completion_media", `job_id=eq.${job.job_id}`],
    ["incidents", `job_id=eq.${job.job_id}`],
    ["incident_evidence", `job_id=eq.${job.job_id}`],
    ["in_app_notifications", `recipient_id=eq.${a.userId}`],
  ]) {
    const denied = await json(`${base}/rest/v1/${table}?${query}&select=*`, {
      headers: apiHeaders(b.access),
    });
    assert(
      `cross-customer ${table} denial`,
      denied.r.ok && denied.body.length === 0,
    );
  }
  const signedDenied = await json(
    `${base}/storage/v1/object/sign/job-media/${path}`,
    {
      method: "POST",
      headers: apiHeaders(b.access),
      body: JSON.stringify({ expiresIn: 60 }),
    },
  );
  assert("cross-customer signed URL denial", !signedDenied.r.ok);
  const anonymousSignedDenied = await json(
    `${base}/storage/v1/object/sign/job-media/${path}`,
    {
      method: "POST",
      headers: apiHeaders(key),
      body: JSON.stringify({ expiresIn: 60 }),
    },
  );
  assert("anonymous signed URL denial", !anonymousSignedDenied.r.ok);
  const crossCustomerUpload = await fetch(
    `${base}/storage/v1/object/job-media/${a.userId}/${job.job_id}/${crypto.randomUUID()}.png`,
    {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${b.access}`,
        "content-type": "image/png",
        "x-upsert": "false",
      },
      body: png,
    },
  );
  assert("cross-customer upload path denial", !crossCustomerUpload.ok);
  const crossCustomerRegistration = await json(
    `${base}/rest/v1/rpc/register_job_media`,
    {
      method: "POST",
      headers: apiHeaders(b.access),
      body: JSON.stringify({
        p_job: job.job_id,
        p_path: path,
        p_mime: "image/png",
        p_size: png.length,
      }),
    },
  );
  assert(
    "cross-customer media ownership substitution denial",
    !crossCustomerRegistration.r.ok,
  );
  const otherMessages = await json(
    `${base}/rest/v1/rpc/get_job_messages_page`,
    {
      method: "POST",
      headers: apiHeaders(b.access),
      body: JSON.stringify({ p_job: job.job_id, p_page: 1, p_page_size: 50 }),
    },
  );
  assert("cross-customer conversation RPC denial", !otherMessages.r.ok);
  const otherMessageRows = await json(
    `${base}/rest/v1/job_messages?job_id=eq.${job.job_id}&select=id`,
    { headers: apiHeaders(b.access) },
  );
  assert(
    "cross-customer message row denial",
    otherMessageRows.r.ok && otherMessageRows.body.length === 0,
  );
  const otherAttachmentRows = await json(
    `${base}/rest/v1/job_message_attachments?job_id=eq.${job.job_id}&select=id`,
    { headers: apiHeaders(b.access) },
  );
  assert(
    "cross-customer attachment metadata denial",
    otherAttachmentRows.r.ok && otherAttachmentRows.body.length === 0,
  );
  const otherPost = await json(`${base}/rest/v1/rpc/post_job_message`, {
    method: "POST",
    headers: apiHeaders(b.access),
    body: JSON.stringify({
      p_job: job.job_id,
      p_channel: "customer_dispatch",
      p_body: "Forbidden cross-customer message",
      p_request_id: crypto.randomUUID(),
    }),
  });
  assert("cross-customer message creation denial", !otherPost.r.ok);
  const attachmentSignedDenied = await json(
    `${base}/storage/v1/object/sign/conversation-attachments/${attachmentPath}`,
    {
      method: "POST",
      headers: apiHeaders(b.access),
      body: JSON.stringify({ expiresIn: 60 }),
    },
  );
  assert(
    "cross-customer attachment signing denial",
    !attachmentSignedDenied.r.ok,
  );
  const deleteDenied = await fetch(
    `${base}/storage/v1/object/job-media/${path}`,
    {
      method: "DELETE",
      headers: { apikey: key, Authorization: `Bearer ${b.access}` },
    },
  );
  assert("cross-customer media deletion denial", !deleteDenied.ok);
  const updateDenied = await fetch(`${base}/rest/v1/jobs?id=eq.${job.job_id}`, {
    method: "PATCH",
    headers: { ...apiHeaders(b.access), Prefer: "return=representation" },
    body: JSON.stringify({ description: "forbidden" }),
  });
  assert(
    "cross-customer job update denial",
    updateDenied.ok && (await updateDenied.json()).length === 0,
  );
  const deleteJobDenied = await fetch(
    `${base}/rest/v1/jobs?id=eq.${job.job_id}`,
    {
      method: "DELETE",
      headers: { ...apiHeaders(b.access), Prefer: "return=representation" },
    },
  );
  assert(
    "cross-customer job deletion denial",
    deleteJobDenied.ok && (await deleteJobDenied.json()).length === 0,
  );
  for (const table of [
    "profiles",
    "customers",
    "jobs",
    "job_media",
    "job_messages",
    "job_message_attachments",
    "quote_versions",
    "job_information_requests",
    "job_information_responses",
    "completion_submissions",
    "completion_media",
    "incidents",
    "incident_evidence",
    "in_app_notifications",
  ]) {
    const anon = await json(`${base}/rest/v1/${table}?select=*`, {
      headers: apiHeaders(key),
    });
    assert(`anonymous ${table} denial`, anon.r.ok && anon.body.length === 0);
  }
  const bad = await fetch(
    `${base}/storage/v1/object/job-media/${a.userId}/${job.job_id}/${crypto.randomUUID()}.pdf`,
    {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${a.access}`,
        "content-type": "application/pdf",
      },
      body: Buffer.from("invalid"),
    },
  );
  assert("invalid file rejection", !bad.ok);
  const reset = await fetch(
    `${base}/auth/v1/recover?redirect_to=${encodeURIComponent(resetRoute)}`,
    {
      method: "POST",
      headers: { apikey: key, "content-type": "application/json" },
      body: JSON.stringify({ email: a.address }),
    },
  );
  assert("password reset request", reset.ok);
  const logout = await fetch(`${base}/auth/v1/logout`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${a.access}` },
  });
  assert("logout", logout.ok);
  console.log(`LIVE E2E PASS: ${results.length} assertions`);
  for (const name of results) console.log(`PASS ${name}`);
} finally {
  await Promise.allSettled(boxes.map(cleanup));
}
