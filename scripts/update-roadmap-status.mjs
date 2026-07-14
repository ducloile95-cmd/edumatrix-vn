import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const statePath = path.join(rootDir, "docs", "upgrade-roadmap-state.json");
const htmlPath = path.join(rootDir, "docs", "upgrade-roadmap.html");
const validStatuses = new Set(["todo", "active", "review", "done", "blocked"]);

function printHelp() {
  console.log(`
Usage:
  npm run roadmap:update -- <task-id> <status> [--note "..."] [--test "..."] [--link "..."]

Statuses:
  todo | active | review | done | blocked

Examples:
  npm run roadmap:update -- P1-001 active --note "Dang sua payment retry"
  npm run roadmap:update -- P1-001 done --test "npm run test:rules PASS" --link "firebase/tests/phase9-rules.test.ts"
`);
}

function readState() {
  return JSON.parse(fs.readFileSync(statePath, "utf8"));
}

function writeState(state) {
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function parseArgs(argv) {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    return { help: true };
  }

  const [taskId, status, ...rest] = argv;
  const options = { taskId, status, note: "", test: "", link: "" };

  for (let index = 0; index < rest.length; index += 1) {
    const flag = rest[index];
    const value = rest[index + 1] ?? "";
    if (flag === "--note") options.note = value;
    if (flag === "--test") options.test = value;
    if (flag === "--link") options.link = value;
    if (flag.startsWith("--")) index += 1;
  }

  return options;
}

function findTask(state, taskId) {
  for (const phase of state.phases) {
    const task = phase.tasks.find((item) => item.id === taskId);
    if (task) return { phase, task };
  }
  return null;
}

function recalculatePhaseStatus(phase) {
  const statuses = phase.tasks.map((task) => task.status);
  if (statuses.every((status) => status === "done")) return "done";
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.some((status) => status === "active" || status === "review" || status === "done")) return "active";
  return "todo";
}

function syncHtmlState(state) {
  if (!fs.existsSync(htmlPath)) return;

  const html = fs.readFileSync(htmlPath, "utf8");
  const nextJson = JSON.stringify(state, null, 2).replaceAll("</script", "<\\/script");
  const marker = /<script id="roadmap-state" type="application\/json">[\s\S]*?<\/script>/;

  if (!marker.test(html)) {
    throw new Error("Cannot find roadmap-state script tag in docs/upgrade-roadmap.html");
  }

  const nextHtml = html.replace(
    marker,
    `<script id="roadmap-state" type="application/json">\n${nextJson}\n  </script>`,
  );
  fs.writeFileSync(htmlPath, nextHtml, "utf8");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  if (!args.taskId || !args.status) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  if (!validStatuses.has(args.status)) {
    throw new Error(`Invalid status "${args.status}". Use: ${Array.from(validStatuses).join(", ")}`);
  }

  const state = readState();
  const found = findTask(state, args.taskId);
  if (!found) throw new Error(`Task not found: ${args.taskId}`);

  const now = new Date().toISOString();
  found.task.status = args.status;
  found.task.updatedAt = now;
  if (args.status === "done") found.task.completedAt = now;
  if (args.note) found.task.note = args.note;

  const evidence = {
    at: now,
    status: args.status,
    note: args.note,
    test: args.test,
    link: args.link,
  };
  found.task.evidence = Array.isArray(found.task.evidence) ? found.task.evidence : [];
  found.task.evidence.push(evidence);

  found.phase.status = recalculatePhaseStatus(found.phase);
  state.lastUpdatedAt = now;
  state.history = Array.isArray(state.history) ? state.history : [];
  state.history.unshift({ taskId: args.taskId, ...evidence });

  writeState(state);
  syncHtmlState(state);
  console.log(`Updated ${args.taskId} -> ${args.status}`);
}

main();
