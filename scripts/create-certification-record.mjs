#!/usr/bin/env node
const allowedStatuses = new Set([
  "automated",
  "human-assisted",
  "passed",
  "failed",
  "blocked",
]);
const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((entry) => entry.startsWith("--") && entry.includes("="))
    .map((entry) => {
      const [key, ...rest] = entry.replace(/^--/, "").split("=");
      return [key, rest.join("=")];
    }),
);
if (process.argv.includes("--help")) {
  console.log(
    "Usage: node scripts/create-certification-record.mjs --environment=staging --deployment=https://preview.example --commit=<sha> --migration=0031 --role=customer --identifier=MUBER-CERT-A-YYYYMMDD --test=login --status=blocked --reason='Disposable inbox unavailable' --cleanup=not-started",
  );
  process.exit(0);
}
const required = [
  "environment",
  "deployment",
  "commit",
  "migration",
  "role",
  "identifier",
  "test",
  "status",
  "cleanup",
];
for (const key of required)
  if (!args[key]) throw new Error(`Missing safe field: ${key}`);
if (!allowedStatuses.has(args.status))
  throw new Error("Invalid certification status");
if (!/^https:\/\//.test(args.deployment) && args.environment !== "local")
  throw new Error("Deployment must be HTTPS");
const combined = Object.values(args).join(" ");
if (
  /(password|access[_ -]?token|refresh[_ -]?token|service[_ -]?role|signed[_ -]?url|eyJ[a-zA-Z0-9_-]{20,}\.)/i.test(
    combined,
  )
)
  throw new Error(
    "Potential secret field detected; record only sanitized identifiers and reasons",
  );
console.log(
  JSON.stringify({
    date_utc: new Date().toISOString(),
    environment: args.environment,
    deployment_url: args.deployment,
    git_commit: args.commit,
    migration_version: args.migration,
    test_role: args.role,
    test_identifier: args.identifier,
    test_performed: args.test,
    status: args.status,
    sanitized_reason: args.reason || null,
    cleanup_status: args.cleanup,
  }),
);
