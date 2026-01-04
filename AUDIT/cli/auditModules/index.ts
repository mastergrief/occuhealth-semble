/**
 * auditModules barrel exports
 * Re-exports all CLI module functionality
 */

// Output utilities
export {
  printHeader,
  printSuccess,
  printError,
  printInfo,
  printJson,
  isJsonOutput,
  printUsage
} from "./output.js";

// Flag parsing utilities
export {
  filterFlags,
  getPositionalArg,
  getNumericFlag,
  getStringFlag,
  hasFlag
} from "./flags.js";

// Plan commands
export {
  listPending,
  loadPending,
  writePending,
  archivePending,
  readPlan,
  handlePlan
} from "./plans.js";

// Suite commands
export {
  startSuite,
  getSuiteStatus,
  completeSuite,
  recordTest,
  listTests,
  getTestSummary,
  handleSuite,
  handleTest
} from "./suites.js";

// Template commands
export {
  listTemplates,
  getTemplate,
  validateTemplate,
  handleTemplate
} from "./templates.js";

// Report commands
export {
  generateReport,
  exportReport,
  handleReport
} from "./reports.js";
