/**
 * Templates module - Audit template management
 */

import * as fs from "fs";
import * as path from "path";
import { printHeader, printSuccess, printError, printInfo, printJson, isJsonOutput } from "./output.js";
import { filterFlags } from "./flags.js";

const TEMPLATES_DIR = path.join(process.cwd(), "AUDIT/templates");

interface TestCategory {
  name: string;
  description: string;
  tests: {
    id: string;
    name: string;
    purpose: string;
    steps: string[];
    verify: string[];
  }[];
}

interface AuditTemplate {
  id: string;
  name: string;
  description: string;
  appType: string;
  categories: TestCategory[];
  scoutPrompts: {
    frontend: string;
    backend: string;
    credentials?: string;
  };
  variables?: string[];
}

/**
 * Get all available templates
 */
export function listTemplates(): AuditTemplate[] {
  if (!fs.existsSync(TEMPLATES_DIR)) {
    return [];
  }

  const files = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith(".json"));
  const templates: AuditTemplate[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(TEMPLATES_DIR, file), "utf-8");
      templates.push(JSON.parse(content));
    } catch {
      // Skip invalid files
    }
  }

  return templates;
}

/**
 * Get a specific template by ID
 */
export function getTemplate(id: string): AuditTemplate | null {
  const filePath = path.join(TEMPLATES_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Validate a template file
 */
export function validateTemplate(filePath: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!fs.existsSync(filePath)) {
    return { valid: false, errors: ["File not found"] };
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const template = JSON.parse(content);

    // Required fields
    if (!template.id) errors.push("Missing 'id' field");
    if (!template.name) errors.push("Missing 'name' field");
    if (!template.description) errors.push("Missing 'description' field");
    if (!template.categories || !Array.isArray(template.categories)) {
      errors.push("Missing or invalid 'categories' array");
    }
    if (!template.scoutPrompts) {
      errors.push("Missing 'scoutPrompts' object");
    } else {
      if (!template.scoutPrompts.frontend) errors.push("Missing 'scoutPrompts.frontend'");
      if (!template.scoutPrompts.backend) errors.push("Missing 'scoutPrompts.backend'");
    }

    // Validate categories
    if (template.categories) {
      template.categories.forEach((cat: TestCategory, i: number) => {
        if (!cat.name) errors.push(`Category ${i}: missing 'name'`);
        if (!cat.tests || !Array.isArray(cat.tests)) {
          errors.push(`Category ${i}: missing or invalid 'tests' array`);
        }
      });
    }

    return { valid: errors.length === 0, errors };
  } catch (e) {
    return { valid: false, errors: [`JSON parse error: ${e}`] };
  }
}

/**
 * Handle template commands
 */
export function handleTemplate(): void {
  const args = filterFlags(process.argv.slice(2));
  const subcommand = args[1];
  const param = args[2];

  switch (subcommand) {
    case "list": {
      const templates = listTemplates();
      if (isJsonOutput()) {
        printJson({ templates, count: templates.length });
      } else {
        printHeader("Available Audit Templates");
        if (templates.length === 0) {
          console.log("  No templates found.");
          console.log(`  Add templates to ${TEMPLATES_DIR}/`);
        } else {
          templates.forEach(t => {
            console.log(`\n  ${t.id}`);
            console.log(`    ${t.name}`);
            console.log(`    ${t.description}`);
            console.log(`    Categories: ${t.categories.length}`);
          });
        }
      }
      break;
    }

    case "show": {
      if (!param) {
        printError("Template ID required");
        process.exit(1);
      }
      const template = getTemplate(param);
      if (isJsonOutput()) {
        printJson(template || { error: "Template not found" });
      } else if (template) {
        printHeader(`Template: ${template.name}`);
        printInfo("ID", template.id);
        printInfo("Type", template.appType || "general");
        printInfo("Description", template.description);
        console.log("\n  Categories:");
        template.categories.forEach(cat => {
          console.log(`    - ${cat.name} (${cat.tests.length} tests)`);
        });
        if (template.variables?.length) {
          console.log("\n  Variables:");
          template.variables.forEach(v => console.log(`    - ${v}`));
        }
      } else {
        printError(`Template "${param}" not found`);
      }
      break;
    }

    case "validate": {
      if (!param) {
        printError("File path required");
        process.exit(1);
      }
      const result = validateTemplate(param);
      if (isJsonOutput()) {
        printJson(result);
      } else if (result.valid) {
        printSuccess("Template is valid");
      } else {
        printError("Template validation failed:");
        result.errors.forEach(e => console.log(`  - ${e}`));
      }
      break;
    }

    default:
      printError(`Unknown template command: ${subcommand}`);
      console.log("Available: list, show, validate");
      process.exit(1);
  }
}
