/**
 * Plans module - Pending plan management
 */

import * as fs from "fs";
import * as path from "path";
import { printHeader, printSuccess, printError, printInfo, printJson, isJsonOutput } from "./output.js";
import { filterFlags, getPositionalArg } from "./flags.js";

const PENDING_DIR = path.join(process.cwd(), "AUDIT/context-hub/pending-plans");

// Ensure directory exists
function ensureDir(): void {
  if (!fs.existsSync(PENDING_DIR)) {
    fs.mkdirSync(PENDING_DIR, { recursive: true });
  }
}

/**
 * List all pending audit plans
 */
export function listPending(): void {
  ensureDir();
  const files = fs.readdirSync(PENDING_DIR)
    .filter(f => f.endsWith(".json"))
    .sort()
    .reverse(); // Most recent first

  if (isJsonOutput()) {
    printJson({ plans: files, count: files.length });
    return;
  }

  printHeader("Pending Audit Plans");
  if (files.length === 0) {
    console.log("  No pending plans found.");
    console.log("  Run /audit-plan to create one.");
    return;
  }

  files.forEach((file, i) => {
    const stat = fs.statSync(path.join(PENDING_DIR, file));
    console.log(`  ${i + 1}. ${file}`);
    console.log(`     Created: ${stat.mtime.toISOString()}`);
  });
}

/**
 * Load a pending plan (or latest if no name specified)
 */
export function loadPending(name?: string): { success: boolean; plan?: unknown; path?: string; error?: string } {
  ensureDir();
  const files = fs.readdirSync(PENDING_DIR)
    .filter(f => f.endsWith(".json"))
    .sort()
    .reverse();

  if (files.length === 0) {
    return { success: false, error: "No pending plans found. Run /audit-plan first." };
  }

  let targetFile: string;
  if (name) {
    // Find matching file
    targetFile = files.find(f => f.includes(name)) ?? "";
    if (!targetFile) {
      return { success: false, error: `No plan matching "${name}" found.` };
    }
  } else {
    // Use latest
    targetFile = files[0];
  }

  const filePath = path.join(PENDING_DIR, targetFile);
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const plan = JSON.parse(content);
    return { success: true, plan, path: filePath };
  } catch (e) {
    return { success: false, error: `Failed to parse plan: ${e}` };
  }
}

/**
 * Write a pending plan
 */
export function writePending(content: string | object): { success: boolean; path?: string; error?: string } {
  ensureDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `plan-${timestamp}.json`;
  const filePath = path.join(PENDING_DIR, fileName);

  try {
    const data = typeof content === "string" ? content : JSON.stringify(content, null, 2);
    fs.writeFileSync(filePath, data, "utf-8");
    return { success: true, path: filePath };
  } catch (e) {
    return { success: false, error: `Failed to write plan: ${e}` };
  }
}

/**
 * Archive a pending plan (mark as executed)
 */
export function archivePending(name?: string): { success: boolean; error?: string } {
  const result = loadPending(name);
  if (!result.success || !result.path) {
    return { success: false, error: result.error };
  }

  try {
    const content = fs.readFileSync(result.path, "utf-8");
    const plan = JSON.parse(content);
    plan.archived = true;
    plan.archivedAt = new Date().toISOString();
    fs.writeFileSync(result.path, JSON.stringify(plan, null, 2), "utf-8");

    // Move to archived folder
    const archiveDir = path.join(process.cwd(), "AUDIT/context-hub/archived-plans");
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }
    const archivePath = path.join(archiveDir, path.basename(result.path));
    fs.renameSync(result.path, archivePath);

    return { success: true };
  } catch (e) {
    return { success: false, error: `Failed to archive: ${e}` };
  }
}

/**
 * Read a specific plan
 */
export function readPlan(name: string): { success: boolean; content?: string; error?: string } {
  ensureDir();
  const files = fs.readdirSync(PENDING_DIR).filter(f => f.includes(name));

  if (files.length === 0) {
    // Check archived
    const archiveDir = path.join(process.cwd(), "AUDIT/context-hub/archived-plans");
    if (fs.existsSync(archiveDir)) {
      const archived = fs.readdirSync(archiveDir).filter(f => f.includes(name));
      if (archived.length > 0) {
        const content = fs.readFileSync(path.join(archiveDir, archived[0]), "utf-8");
        return { success: true, content };
      }
    }
    return { success: false, error: `Plan "${name}" not found.` };
  }

  const content = fs.readFileSync(path.join(PENDING_DIR, files[0]), "utf-8");
  return { success: true, content };
}

/**
 * Handle plan commands
 */
export function handlePlan(): void {
  const args = filterFlags(process.argv.slice(2));
  const subcommand = args[1];
  const param = args[2];

  switch (subcommand) {
    case "list-pending":
      listPending();
      break;

    case "load-pending": {
      const result = loadPending(param);
      if (isJsonOutput()) {
        printJson(result);
      } else if (result.success) {
        printHeader("Loaded Plan");
        printInfo("Path", result.path!);
        console.log("\n" + JSON.stringify(result.plan, null, 2));
      } else {
        printError(result.error!);
      }
      break;
    }

    case "write-pending": {
      if (!param) {
        printError("Content or file path required");
        process.exit(1);
      }
      // Check if it's a file path or raw content
      let content: string;
      if (fs.existsSync(param)) {
        content = fs.readFileSync(param, "utf-8");
      } else {
        content = param;
      }
      const result = writePending(content);
      if (isJsonOutput()) {
        printJson(result);
      } else if (result.success) {
        printSuccess(`Plan written to ${result.path}`);
      } else {
        printError(result.error!);
      }
      break;
    }

    case "archive-pending": {
      const result = archivePending(param);
      if (isJsonOutput()) {
        printJson(result);
      } else if (result.success) {
        printSuccess("Plan archived successfully");
      } else {
        printError(result.error!);
      }
      break;
    }

    case "read": {
      if (!param) {
        printError("Plan name required");
        process.exit(1);
      }
      const result = readPlan(param);
      if (isJsonOutput()) {
        printJson(result);
      } else if (result.success) {
        console.log(result.content);
      } else {
        printError(result.error!);
      }
      break;
    }

    default:
      printError(`Unknown plan command: ${subcommand}`);
      console.log("Available: list-pending, load-pending, write-pending, archive-pending, read");
      process.exit(1);
  }
}
