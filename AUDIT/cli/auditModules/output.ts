/**
 * Output module - CLI output helpers and usage display
 */

// =============================================================================
// OUTPUT HELPERS
// =============================================================================

export function printHeader(title: string): void {
  console.log("\n" + "=".repeat(60));
  console.log(`  ${title}`);
  console.log("=".repeat(60));
}

export function printSuccess(message: string): void {
  console.log(`[OK] ${message}`);
}

export function printError(message: string): void {
  console.error(`[ERROR] ${message}`);
}

export function printInfo(label: string, value: string): void {
  console.log(`  ${label.padEnd(18)}: ${value}`);
}

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function isJsonOutput(): boolean {
  return process.argv.includes("--json");
}

// =============================================================================
// USAGE TEXT
// =============================================================================

export function printUsage(): void {
  console.log(`
AUDIT CLI - Browser-Based Testing Framework
=============================================================

Usage: npx tsx AUDIT/cli/audit.ts <command> [options]

Plan Management:
  plan list-pending          List pending audit plans
  plan load-pending [name]   Load specific pending plan (or latest)
  plan write-pending <file>  Write pending plan from JSON file
  plan archive-pending       Archive pending plan (mark as executed)
  plan read <name>           Read specific plan content

Suite Management:
  suite start <name>         Start a test suite
  suite status               Show current suite status
  suite complete             Complete current suite

Test Recording:
  test record <id> <status> <evidence>  Record test result
  test list                  List tests in current suite
  test summary               Show test summary (pass/fail counts)

Report Generation:
  report generate            Generate report from current suite
  report export [--format=md|json|html]  Export report

Template Management:
  template list              List available templates
  template show <id>         Show template details
  template validate <file>   Validate template JSON

Status & Help:
  status                     Show overall audit status
  help                       Show this help message

Options:
  --json                     Output as JSON
  --format <type>            Export format (md, json, html)

Templates Available:
  web-app              Standard SPA with authentication
  api-only             Backend API testing (no UI)
  static-site          Static site testing (no auth)
  authenticated-app    Heavy authentication flows
  dashboard            Data visualization focus
  e-commerce           Cart, checkout flows
  mobile-responsive    Viewport/responsive testing
  accessibility        A11y focused testing

Examples:
  # List pending audit plans
  npx tsx AUDIT/cli/audit.ts plan list-pending

  # Load most recent pending plan
  npx tsx AUDIT/cli/audit.ts plan load-pending

  # Start test suite
  npx tsx AUDIT/cli/audit.ts suite start auth-tests

  # Record a test result
  npx tsx AUDIT/cli/audit.ts test record T1.1 PASS "screenshot-login.png"

  # Generate report
  npx tsx AUDIT/cli/audit.ts report generate

  # Export report as markdown
  npx tsx AUDIT/cli/audit.ts report export --format=md

  # List available templates
  npx tsx AUDIT/cli/audit.ts template list --json
`);
}
