/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_generateInsights from "../actions/generateInsights.js";
import type * as analytics from "../analytics.js";
import type * as authz from "../authz.js";
import type * as campaigns from "../campaigns.js";
import type * as closures from "../closures.js";
import type * as crons from "../crons.js";
import type * as customers from "../customers.js";
import type * as dependencyStatus from "../dependencyStatus.js";
import type * as extraConvocations from "../extraConvocations.js";
import type * as extras from "../extras.js";
import type * as feedbacks from "../feedbacks.js";
import type * as http from "../http.js";
import type * as insights from "../insights.js";
import type * as invitations from "../invitations.js";
import type * as members from "../members.js";
import type * as menuItems from "../menuItems.js";
import type * as messages from "../messages.js";
import type * as payments from "../payments.js";
import type * as planning from "../planning.js";
import type * as posIntegrations from "../posIntegrations.js";
import type * as rateLimits from "../rateLimits.js";
import type * as restaurants from "../restaurants.js";
import type * as seed from "../seed.js";
import type * as shifts from "../shifts.js";
import type * as tables from "../tables.js";
import type * as zones from "../zones.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/generateInsights": typeof actions_generateInsights;
  analytics: typeof analytics;
  authz: typeof authz;
  campaigns: typeof campaigns;
  closures: typeof closures;
  crons: typeof crons;
  customers: typeof customers;
  dependencyStatus: typeof dependencyStatus;
  extraConvocations: typeof extraConvocations;
  extras: typeof extras;
  feedbacks: typeof feedbacks;
  http: typeof http;
  insights: typeof insights;
  invitations: typeof invitations;
  members: typeof members;
  menuItems: typeof menuItems;
  messages: typeof messages;
  payments: typeof payments;
  planning: typeof planning;
  posIntegrations: typeof posIntegrations;
  rateLimits: typeof rateLimits;
  restaurants: typeof restaurants;
  seed: typeof seed;
  shifts: typeof shifts;
  tables: typeof tables;
  zones: typeof zones;
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
