/**
 * Suites module - Test suite management
 */

import * as fs from "fs";
import * as path from "path";
import { printHeader, printSuccess, printError, printInfo, printJson, isJsonOutput } from "./output.js";
import { filterFlags } from "./flags.js";

const STATE_FILE = path.join(process.cwd(), "AUDIT/context-hub/current-suite.json");

interface TestResult {
  id: string;
  status: "PASS" | "FAIL" | "PARTIAL" | "BLOCKED" | "SKIPPED";
  evidence: string;
  timestamp: string;
  notes?: string;
}

interface Suite {
  name: string;
  startedAt: string;
  completedAt?: string;
  tests: TestResult[];
}

function loadSuite(): Suite | null {
  if (!fs.existsSync(STATE_FILE)) {
    return null;
  }
  try {
    const content = fs.readFileSync(STATE_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function saveSuite(suite: Suite): void {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify(suite, null, 2), "utf-8");
}

/**
 * Start a new test suite
 */
export function startSuite(name: string): { success: boolean; suite?: Suite; error?: string } {
  const existing = loadSuite();
  if (existing && !existing.completedAt) {
    return {
      success: false,
      error: `Suite "${existing.name}" is still active. Complete or abort it first.`
    };
  }

  const suite: Suite = {
    name,
    startedAt: new Date().toISOString(),
    tests: []
  };

  saveSuite(suite);
  return { success: true, suite };
}

/**
 * Get current suite status
 */
export function getSuiteStatus(): { active: boolean; suite?: Suite } {
  const suite = loadSuite();
  if (!suite || suite.completedAt) {
    return { active: false };
  }

  const counts = {
    total: suite.tests.length,
    pass: suite.tests.filter(t => t.status === "PASS").length,
    fail: suite.tests.filter(t => t.status === "FAIL").length,
    partial: suite.tests.filter(t => t.status === "PARTIAL").length,
    blocked: suite.tests.filter(t => t.status === "BLOCKED").length,
    skipped: suite.tests.filter(t => t.status === "SKIPPED").length
  };

  return { active: true, suite: { ...suite, ...counts } as unknown as Suite };
}

/**
 * Complete current suite
 */
export function completeSuite(): { success: boolean; suite?: Suite; error?: string } {
  const suite = loadSuite();
  if (!suite) {
    return { success: false, error: "No active suite found." };
  }
  if (suite.completedAt) {
    return { success: false, error: "Suite already completed." };
  }

  suite.completedAt = new Date().toISOString();
  saveSuite(suite);

  // Archive to reports
  const reportsDir = path.join(process.cwd(), "AUDIT/reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(reportsDir, `suite-${suite.name}-${timestamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(suite, null, 2), "utf-8");

  return { success: true, suite };
}

/**
 * Record a test result
 */
export function recordTest(
  id: string,
  status: TestResult["status"],
  evidence: string,
  notes?: string
): { success: boolean; error?: string } {
  const suite = loadSuite();
  if (!suite) {
    return { success: false, error: "No active suite. Run 'suite start <name>' first." };
  }
  if (suite.completedAt) {
    return { success: false, error: "Suite already completed." };
  }

  // Check for duplicate
  const existing = suite.tests.findIndex(t => t.id === id);
  const result: TestResult = {
    id,
    status,
    evidence,
    timestamp: new Date().toISOString(),
    notes
  };

  if (existing >= 0) {
    suite.tests[existing] = result; // Update
  } else {
    suite.tests.push(result);
  }

  saveSuite(suite);
  return { success: true };
}

/**
 * List tests in current suite
 */
export function listTests(): TestResult[] {
  const suite = loadSuite();
  return suite?.tests ?? [];
}

/**
 * Get test summary
 */
export function getTestSummary(): {
  total: number;
  pass: number;
  fail: number;
  partial: number;
  blocked: number;
  skipped: number;
  passRate: string;
} {
  const tests = listTests();
  const total = tests.length;
  const pass = tests.filter(t => t.status === "PASS").length;
  const fail = tests.filter(t => t.status === "FAIL").length;
  const partial = tests.filter(t => t.status === "PARTIAL").length;
  const blocked = tests.filter(t => t.status === "BLOCKED").length;
  const skipped = tests.filter(t => t.status === "SKIPPED").length;
  const passRate = total > 0 ? ((pass / total) * 100).toFixed(1) + "%" : "0%";

  return { total, pass, fail, partial, blocked, skipped, passRate };
}

/**
 * Handle suite commands
 */
export function handleSuite(): void {
  const args = filterFlags(process.argv.slice(2));
  const subcommand = args[1];
  const param = args[2];

  switch (subcommand) {
    case "start": {
      if (!param) {
        printError("Suite name required");
        process.exit(1);
      }
      const result = startSuite(param);
      if (isJsonOutput()) {
        printJson(result);
      } else if (result.success) {
        printSuccess(`Suite "${param}" started`);
      } else {
        printError(result.error!);
      }
      break;
    }

    case "status": {
      const result = getSuiteStatus();
      if (isJsonOutput()) {
        printJson(result);
      } else if (result.active && result.suite) {
        printHeader(`Suite: ${result.suite.name}`);
        printInfo("Started", result.suite.startedAt);
        printInfo("Tests", String(result.suite.tests.length));
        const summary = getTestSummary();
        printInfo("Pass Rate", summary.passRate);
        console.log(`\n  ✅ ${summary.pass} | ❌ ${summary.fail} | ⚠️ ${summary.partial} | ⬜ ${summary.blocked} | ⏭️ ${summary.skipped}`);
      } else {
        console.log("No active suite.");
      }
      break;
    }

    case "complete": {
      const result = completeSuite();
      if (isJsonOutput()) {
        printJson(result);
      } else if (result.success) {
        printSuccess("Suite completed and archived");
        const summary = getTestSummary();
        console.log(`\nFinal Results: ${summary.passRate} pass rate`);
        console.log(`  ✅ ${summary.pass} | ❌ ${summary.fail} | ⚠️ ${summary.partial} | ⬜ ${summary.blocked}`);
      } else {
        printError(result.error!);
      }
      break;
    }

    default:
      printError(`Unknown suite command: ${subcommand}`);
      console.log("Available: start, status, complete");
      process.exit(1);
  }
}

/**
 * Handle test commands
 */
export function handleTest(): void {
  const args = filterFlags(process.argv.slice(2));
  const subcommand = args[1];

  switch (subcommand) {
    case "record": {
      const id = args[2];
      const status = args[3] as TestResult["status"];
      const evidence = args[4] || "";
      const notes = args[5];

      if (!id || !status) {
        printError("Usage: test record <id> <PASS|FAIL|PARTIAL|BLOCKED|SKIPPED> [evidence] [notes]");
        process.exit(1);
      }

      if (!["PASS", "FAIL", "PARTIAL", "BLOCKED", "SKIPPED"].includes(status)) {
        printError("Status must be: PASS, FAIL, PARTIAL, BLOCKED, or SKIPPED");
        process.exit(1);
      }

      const result = recordTest(id, status, evidence, notes);
      if (isJsonOutput()) {
        printJson(result);
      } else if (result.success) {
        const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⚠️";
        printSuccess(`${icon} ${id}: ${status}`);
      } else {
        printError(result.error!);
      }
      break;
    }

    case "list": {
      const tests = listTests();
      if (isJsonOutput()) {
        printJson({ tests, count: tests.length });
      } else {
        printHeader("Test Results");
        if (tests.length === 0) {
          console.log("  No tests recorded yet.");
        } else {
          tests.forEach(t => {
            const icon = t.status === "PASS" ? "✅" :
                        t.status === "FAIL" ? "❌" :
                        t.status === "PARTIAL" ? "⚠️" :
                        t.status === "BLOCKED" ? "⬜" : "⏭️";
            console.log(`  ${icon} ${t.id}: ${t.status}`);
            if (t.evidence) console.log(`     Evidence: ${t.evidence}`);
          });
        }
      }
      break;
    }

    case "summary": {
      const summary = getTestSummary();
      if (isJsonOutput()) {
        printJson(summary);
      } else {
        printHeader("Test Summary");
        printInfo("Total Tests", String(summary.total));
        printInfo("Pass Rate", summary.passRate);
        console.log(`\n  ✅ Pass: ${summary.pass}`);
        console.log(`  ❌ Fail: ${summary.fail}`);
        console.log(`  ⚠️ Partial: ${summary.partial}`);
        console.log(`  ⬜ Blocked: ${summary.blocked}`);
        console.log(`  ⏭️ Skipped: ${summary.skipped}`);
      }
      break;
    }

    default:
      printError(`Unknown test command: ${subcommand}`);
      console.log("Available: record, list, summary");
      process.exit(1);
  }
}
