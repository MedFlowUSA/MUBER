import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const staticRoot = path.join(process.cwd(), ".next", "static");
const forbiddenPatterns = [
  {
    name: "service-role environment name",
    pattern: /SUPABASE_SERVICE_ROLE_KEY/,
  },
  { name: "Supabase secret key", pattern: /sb_secret_[A-Za-z0-9_-]{20,}/ },
  { name: "private key", pattern: /BEGIN PRIVATE KEY/ },
  {
    name: "Postgres credential URL",
    pattern: /postgres(?:ql)?:\/\/[^\s:"']+:[^\s@"']+@/,
  },
];

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const item = path.join(directory, entry.name);
        return entry.isDirectory() ? filesIn(item) : [item];
      }),
    )
  ).flat();
}

const files = (await filesIn(staticRoot)).filter((file) =>
  /\.(?:js|json|map)$/.test(file),
);
const findings = [];
for (const file of files) {
  const contents = await readFile(file, "utf8");
  for (const candidate of forbiddenPatterns) {
    if (candidate.pattern.test(contents))
      findings.push({ file, name: candidate.name });
  }
}

if (findings.length) {
  for (const finding of findings) {
    console.error(
      `Forbidden ${finding.name} found in ${path.relative(process.cwd(), finding.file)}`,
    );
  }
  process.exitCode = 1;
} else {
  console.log(`Client bundle scan passed (${files.length} files checked)`);
}
