#!/usr/bin/env npx tsx
/**
 * AUDIT CLI - Browser-Based Testing Framework
 *
 * Command-line interface for audit system.
 * This facade routes commands to focused modules in ./auditModules/
 *
 * Usage: npx tsx AUDIT/cli/audit.ts <command> [options]
 */

import { printError, printUsage, filterFlags } from "./auditModules/index.js";

async function main(): Promise<void> {
  const positionalArgs = filterFlags(process.argv.slice(2));
  const command = positionalArgs[0];

  try {
    switch (command) {
      case "plan":
        return (await import("./auditModules/plans.js")).handlePlan();

      case "suite":
        return (await import("./auditModules/suites.js")).handleSuite();

      case "test":
        return (await import("./auditModules/suites.js")).handleTest();

      case "template":
        return (await import("./auditModules/templates.js")).handleTemplate();

      case "report":
        return (await import("./auditModules/reports.js")).handleReport();

      case "status": {
        const { getSuiteStatus, getTestSummary, listPending } = await import("./auditModules/index.js");
        const { printHeader, printInfo, isJsonOutput, printJson } = await import("./auditModules/index.js");

        const suiteStatus = getSuiteStatus();
        const summary = getTestSummary();

        if (isJsonOutput()) {
          printJson({ suite: suiteStatus, summary });
        } else {
          printHeader("Audit Status");
          if (suiteStatus.active && suiteStatus.suite) {
            printInfo("Active Suite", suiteStatus.suite.name);
            printInfo("Tests Run", String(summary.total));
            printInfo("Pass Rate", summary.passRate);
            console.log(`\n  ✅ ${summary.pass} | ❌ ${summary.fail} | ⚠️ ${summary.partial} | ⬜ ${summary.blocked}`);
          } else {
            console.log("  No active test suite.");
          }
          console.log("\n  Run 'plan list-pending' to see available plans.");
        }
        break;
      }

      case "help":
      case "--help":
      case "-h":
      case undefined:
        return printUsage();

      default:
        printError(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    printError(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
