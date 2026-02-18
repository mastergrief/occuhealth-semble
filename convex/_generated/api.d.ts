/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_aiReportSuggestion from "../actions/aiReportSuggestion.js";
import type * as actions_employerRegistration from "../actions/employerRegistration.js";
import type * as adminUsers from "../adminUsers.js";
import type * as aiHelpers from "../aiHelpers.js";
import type * as appointmentTokens from "../appointmentTokens.js";
import type * as appointmentTypes from "../appointmentTypes.js";
import type * as appointments from "../appointments.js";
import type * as auth from "../auth.js";
import type * as authModules_authorization from "../authModules/authorization.js";
import type * as authModules_index from "../authModules/index.js";
import type * as availableSlots from "../availableSlots.js";
import type * as availableSlotsModules_index from "../availableSlotsModules/index.js";
import type * as availableSlotsModules_mutations from "../availableSlotsModules/mutations.js";
import type * as availableSlotsModules_queries from "../availableSlotsModules/queries.js";
import type * as availableSlotsModules_recurring from "../availableSlotsModules/recurring.js";
import type * as availableSlotsModules_types from "../availableSlotsModules/types.js";
import type * as clinicalNotes from "../clinicalNotes.js";
import type * as crons from "../crons.js";
import type * as doctorSettings from "../doctorSettings.js";
import type * as employers from "../employers.js";
import type * as gdpr from "../gdpr.js";
import type * as gdprModules_audit from "../gdprModules/audit.js";
import type * as gdprModules_consent from "../gdprModules/consent.js";
import type * as gdprModules_erasure from "../gdprModules/erasure.js";
import type * as gdprModules_export from "../gdprModules/export.js";
import type * as gdprModules_index from "../gdprModules/index.js";
import type * as gdprModules_stats from "../gdprModules/stats.js";
import type * as gdprModules_types from "../gdprModules/types.js";
import type * as helpers_auditLogger from "../helpers/auditLogger.js";
import type * as helpers_batchFetch from "../helpers/batchFetch.js";
import type * as helpers_pagination from "../helpers/pagination.js";
import type * as http from "../http.js";
import type * as lib_ai_cache from "../lib/ai/cache.js";
import type * as lib_ai_index from "../lib/ai/index.js";
import type * as lib_ai_prompts_index from "../lib/ai/prompts/index.js";
import type * as lib_ai_prompts_reportSuggestion from "../lib/ai/prompts/reportSuggestion.js";
import type * as lib_ai_providers_index from "../lib/ai/providers/index.js";
import type * as lib_ai_providers_openai from "../lib/ai/providers/openai.js";
import type * as lib_ai_providers_types from "../lib/ai/providers/types.js";
import type * as lib_ai_retry from "../lib/ai/retry.js";
import type * as lib_ai_schemas_reportSuggestion from "../lib/ai/schemas/reportSuggestion.js";
import type * as lib_dateUtils from "../lib/dateUtils.js";
import type * as lib_errorCodes from "../lib/errorCodes.js";
import type * as lib_icsGenerator from "../lib/icsGenerator.js";
import type * as lib_rateLimiter from "../lib/rateLimiter.js";
import type * as myFunctions from "../myFunctions.js";
import type * as oauthState from "../oauthState.js";
import type * as patients from "../patients.js";
import type * as reports from "../reports.js";
import type * as scheduled_dataRetention from "../scheduled/dataRetention.js";
import type * as scheduled_gdprStatsCache from "../scheduled/gdprStatsCache.js";
import type * as seedAdmin from "../seedAdmin.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/aiReportSuggestion": typeof actions_aiReportSuggestion;
  "actions/employerRegistration": typeof actions_employerRegistration;
  adminUsers: typeof adminUsers;
  aiHelpers: typeof aiHelpers;
  appointmentTokens: typeof appointmentTokens;
  appointmentTypes: typeof appointmentTypes;
  appointments: typeof appointments;
  auth: typeof auth;
  "authModules/authorization": typeof authModules_authorization;
  "authModules/index": typeof authModules_index;
  availableSlots: typeof availableSlots;
  "availableSlotsModules/index": typeof availableSlotsModules_index;
  "availableSlotsModules/mutations": typeof availableSlotsModules_mutations;
  "availableSlotsModules/queries": typeof availableSlotsModules_queries;
  "availableSlotsModules/recurring": typeof availableSlotsModules_recurring;
  "availableSlotsModules/types": typeof availableSlotsModules_types;
  clinicalNotes: typeof clinicalNotes;
  crons: typeof crons;
  doctorSettings: typeof doctorSettings;
  employers: typeof employers;
  gdpr: typeof gdpr;
  "gdprModules/audit": typeof gdprModules_audit;
  "gdprModules/consent": typeof gdprModules_consent;
  "gdprModules/erasure": typeof gdprModules_erasure;
  "gdprModules/export": typeof gdprModules_export;
  "gdprModules/index": typeof gdprModules_index;
  "gdprModules/stats": typeof gdprModules_stats;
  "gdprModules/types": typeof gdprModules_types;
  "helpers/auditLogger": typeof helpers_auditLogger;
  "helpers/batchFetch": typeof helpers_batchFetch;
  "helpers/pagination": typeof helpers_pagination;
  http: typeof http;
  "lib/ai/cache": typeof lib_ai_cache;
  "lib/ai/index": typeof lib_ai_index;
  "lib/ai/prompts/index": typeof lib_ai_prompts_index;
  "lib/ai/prompts/reportSuggestion": typeof lib_ai_prompts_reportSuggestion;
  "lib/ai/providers/index": typeof lib_ai_providers_index;
  "lib/ai/providers/openai": typeof lib_ai_providers_openai;
  "lib/ai/providers/types": typeof lib_ai_providers_types;
  "lib/ai/retry": typeof lib_ai_retry;
  "lib/ai/schemas/reportSuggestion": typeof lib_ai_schemas_reportSuggestion;
  "lib/dateUtils": typeof lib_dateUtils;
  "lib/errorCodes": typeof lib_errorCodes;
  "lib/icsGenerator": typeof lib_icsGenerator;
  "lib/rateLimiter": typeof lib_rateLimiter;
  myFunctions: typeof myFunctions;
  oauthState: typeof oauthState;
  patients: typeof patients;
  reports: typeof reports;
  "scheduled/dataRetention": typeof scheduled_dataRetention;
  "scheduled/gdprStatsCache": typeof scheduled_gdprStatsCache;
  seedAdmin: typeof seedAdmin;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
