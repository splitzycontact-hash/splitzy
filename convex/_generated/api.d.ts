/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auditLogs from "../auditLogs.js";
import type * as billing from "../billing.js";
import type * as bugs from "../bugs.js";
import type * as communications from "../communications.js";
import type * as config from "../config.js";
import type * as dependencyStatus from "../dependencyStatus.js";
import type * as featureFlags from "../featureFlags.js";
import type * as feedbacks from "../feedbacks.js";
import type * as growth from "../growth.js";
import type * as lib from "../lib.js";
import type * as menuItems from "../menuItems.js";
import type * as payments from "../payments.js";
import type * as posIntegrations from "../posIntegrations.js";
import type * as restaurantNotes from "../restaurantNotes.js";
import type * as restaurants from "../restaurants.js";
import type * as seed from "../seed.js";
import type * as tables from "../tables.js";
import type * as team from "../team.js";
import type * as tickets from "../tickets.js";
import type * as transactions from "../transactions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auditLogs: typeof auditLogs;
  billing: typeof billing;
  bugs: typeof bugs;
  communications: typeof communications;
  config: typeof config;
  dependencyStatus: typeof dependencyStatus;
  featureFlags: typeof featureFlags;
  feedbacks: typeof feedbacks;
  growth: typeof growth;
  lib: typeof lib;
  menuItems: typeof menuItems;
  payments: typeof payments;
  posIntegrations: typeof posIntegrations;
  restaurantNotes: typeof restaurantNotes;
  restaurants: typeof restaurants;
  seed: typeof seed;
  tables: typeof tables;
  team: typeof team;
  tickets: typeof tickets;
  transactions: typeof transactions;
  users: typeof users;
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
