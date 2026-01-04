/**
 * Reports module - Report generation and export
 */

import * as fs from "fs";
import * as path from "path";
import { printHeader, printSuccess, printError, printInfo, printJson, isJsonOutput } from "./output.js";
import { filterFlags, getStringFlag } from "./flags.js";
import { getSuiteStatus, getTestSummary, listTests } from "./suites.js";

const REPORTS_DIR = path.join(process.cwd(), "AUDIT/reports");

interface TestResult {
  id: string;
  status: "PASS" | "FAIL" | "PARTIAL" | "BLOCKED" | "SKIPPED";
  evidence: string;
  timestamp: string;
  notes?: string;
}

interface Report {
  title: string;
  generatedAt: string;
  suiteName: string;
  duration: string;
  summary: {
    total: number;
    pass: number;
    fail: number;
    partial: number;
    blocked: number;
    skipped: number;
    passRate: string;
  };
  tests: TestResult[];
  issues: {
    critical: TestResult[];
    major: TestResult[];
    minor: TestResult[];
  };
}

/**
 * Generate a report from current suite
 */
export function generateReport(): { success: boolean; report?: Report; error?: string } {
  const status = getSuiteStatus();
  if (!status.active && !status.suite) {
    return { success: false, error: "No active or completed suite found." };
  }

  const suite = status.suite!;
  const tests = listTests();
  const summary = getTestSummary();

  // Categorize issues
  const issues = {
    critical: tests.filter(t => t.status === "FAIL"),
    major: tests.filter(t => t.status === "PARTIAL"),
    minor: tests.filter(t => t.status === "BLOCKED")
  };

  // Calculate duration
  const startTime = new Date(suite.startedAt).getTime();
  const endTime = suite.completedAt
    ? new Date(suite.completedAt).getTime()
    : Date.now();
  const durationMs = endTime - startTime;
  const durationMin = Math.floor(durationMs / 60000);
  const durationSec = Math.floor((durationMs % 60000) / 1000);
  const duration = `${durationMin}m ${durationSec}s`;

  const report: Report = {
    title: `Audit Report: ${suite.name}`,
    generatedAt: new Date().toISOString(),
    suiteName: suite.name,
    duration,
    summary,
    tests,
    issues
  };

  return { success: true, report };
}

/**
 * Export report in specified format
 */
export function exportReport(format: "md" | "json" | "html"): { success: boolean; path?: string; error?: string } {
  const result = generateReport();
  if (!result.success || !result.report) {
    return { success: false, error: result.error };
  }

  const report = result.report;

  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  let filePath: string;
  let content: string;

  switch (format) {
    case "json":
      filePath = path.join(REPORTS_DIR, `report-${timestamp}.json`);
      content = JSON.stringify(report, null, 2);
      break;

    case "html":
      filePath = path.join(REPORTS_DIR, `report-${timestamp}.html`);
      content = generateHtmlReport(report);
      break;

    case "md":
    default:
      filePath = path.join(REPORTS_DIR, `report-${timestamp}.md`);
      content = generateMarkdownReport(report);
      break;
  }

  try {
    fs.writeFileSync(filePath, content, "utf-8");
    return { success: true, path: filePath };
  } catch (e) {
    return { success: false, error: `Failed to write report: ${e}` };
  }
}

function generateMarkdownReport(report: Report): string {
  const lines: string[] = [
    `# ${report.title}`,
    "",
    `**Generated**: ${report.generatedAt}`,
    `**Duration**: ${report.duration}`,
    "",
    "## Executive Summary",
    "",
    `- **Total Tests**: ${report.summary.total}`,
    `- **Pass Rate**: ${report.summary.passRate}`,
    `- ✅ Passed: ${report.summary.pass}`,
    `- ❌ Failed: ${report.summary.fail}`,
    `- ⚠️ Partial: ${report.summary.partial}`,
    `- ⬜ Blocked: ${report.summary.blocked}`,
    `- ⏭️ Skipped: ${report.summary.skipped}`,
    "",
    "## Test Results",
    "",
    "| ID | Status | Evidence | Notes |",
    "|---|---|---|---|"
  ];

  for (const test of report.tests) {
    const statusIcon = test.status === "PASS" ? "✅" :
                       test.status === "FAIL" ? "❌" :
                       test.status === "PARTIAL" ? "⚠️" :
                       test.status === "BLOCKED" ? "⬜" : "⏭️";
    lines.push(`| ${test.id} | ${statusIcon} ${test.status} | ${test.evidence || "-"} | ${test.notes || "-"} |`);
  }

  if (report.issues.critical.length > 0) {
    lines.push("", "## Critical Issues (Failed)", "");
    for (const issue of report.issues.critical) {
      lines.push(`- **${issue.id}**: ${issue.notes || "No details"}`);
      if (issue.evidence) lines.push(`  - Evidence: ${issue.evidence}`);
    }
  }

  if (report.issues.major.length > 0) {
    lines.push("", "## Major Issues (Partial)", "");
    for (const issue of report.issues.major) {
      lines.push(`- **${issue.id}**: ${issue.notes || "No details"}`);
    }
  }

  if (report.issues.minor.length > 0) {
    lines.push("", "## Minor Issues (Blocked)", "");
    for (const issue of report.issues.minor) {
      lines.push(`- **${issue.id}**: ${issue.notes || "No details"}`);
    }
  }

  return lines.join("\n");
}

function generateHtmlReport(report: Report): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>${report.title}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1000px; margin: 40px auto; padding: 0 20px; }
    h1 { color: #333; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin: 20px 0; }
    .stat { background: #f5f5f5; padding: 16px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 2em; font-weight: bold; }
    .pass { color: #22c55e; }
    .fail { color: #ef4444; }
    .partial { color: #f59e0b; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e5e5; }
    th { background: #f5f5f5; }
    .issue { background: #fef2f2; padding: 12px; border-left: 4px solid #ef4444; margin: 8px 0; }
    .issue.major { background: #fffbeb; border-color: #f59e0b; }
    .issue.minor { background: #f5f5f5; border-color: #9ca3af; }
  </style>
</head>
<body>
  <h1>${report.title}</h1>
  <p><strong>Generated:</strong> ${report.generatedAt}</p>
  <p><strong>Duration:</strong> ${report.duration}</p>

  <h2>Summary</h2>
  <div class="summary">
    <div class="stat"><div class="stat-value">${report.summary.total}</div>Total Tests</div>
    <div class="stat"><div class="stat-value pass">${report.summary.pass}</div>Passed</div>
    <div class="stat"><div class="stat-value fail">${report.summary.fail}</div>Failed</div>
    <div class="stat"><div class="stat-value partial">${report.summary.partial}</div>Partial</div>
    <div class="stat"><div class="stat-value">${report.summary.passRate}</div>Pass Rate</div>
  </div>

  <h2>Test Results</h2>
  <table>
    <tr><th>ID</th><th>Status</th><th>Evidence</th><th>Notes</th></tr>
    ${report.tests.map(t => `<tr>
      <td>${t.id}</td>
      <td class="${t.status.toLowerCase()}">${t.status}</td>
      <td>${t.evidence || "-"}</td>
      <td>${t.notes || "-"}</td>
    </tr>`).join("")}
  </table>

  ${report.issues.critical.length > 0 ? `
  <h2>Critical Issues</h2>
  ${report.issues.critical.map(i => `<div class="issue"><strong>${i.id}</strong>: ${i.notes || "No details"}</div>`).join("")}
  ` : ""}

  ${report.issues.major.length > 0 ? `
  <h2>Major Issues</h2>
  ${report.issues.major.map(i => `<div class="issue major"><strong>${i.id}</strong>: ${i.notes || "No details"}</div>`).join("")}
  ` : ""}
</body>
</html>`;
}

/**
 * Handle report commands
 */
export function handleReport(): void {
  const args = filterFlags(process.argv.slice(2));
  const subcommand = args[1];

  switch (subcommand) {
    case "generate": {
      const result = generateReport();
      if (isJsonOutput()) {
        printJson(result);
      } else if (result.success && result.report) {
        printHeader(result.report.title);
        printInfo("Duration", result.report.duration);
        printInfo("Total Tests", String(result.report.summary.total));
        printInfo("Pass Rate", result.report.summary.passRate);
        console.log(`\n  ✅ ${result.report.summary.pass} | ❌ ${result.report.summary.fail} | ⚠️ ${result.report.summary.partial}`);

        if (result.report.issues.critical.length > 0) {
          console.log(`\n  Critical Issues: ${result.report.issues.critical.length}`);
        }
      } else {
        printError(result.error!);
      }
      break;
    }

    case "export": {
      const format = (getStringFlag("format", "md") || "md") as "md" | "json" | "html";
      if (!["md", "json", "html"].includes(format)) {
        printError("Format must be: md, json, or html");
        process.exit(1);
      }

      const result = exportReport(format);
      if (isJsonOutput()) {
        printJson(result);
      } else if (result.success) {
        printSuccess(`Report exported to ${result.path}`);
      } else {
        printError(result.error!);
      }
      break;
    }

    default:
      printError(`Unknown report command: ${subcommand}`);
      console.log("Available: generate, export");
      process.exit(1);
  }
}
