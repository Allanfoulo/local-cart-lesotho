/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTP from "../ResendOTP.js";
import type * as auth from "../auth.js";
import type * as catalog from "../catalog.js";
import type * as customers from "../customers.js";
import type * as deliveryPlaces from "../deliveryPlaces.js";
import type * as http from "../http.js";
import type * as invitations from "../invitations.js";
import type * as lib_authorization from "../lib/authorization.js";
import type * as lib_environment from "../lib/environment.js";
import type * as memberships from "../memberships.js";
import type * as orders from "../orders.js";
import type * as seed from "../seed.js";
import type * as stores from "../stores.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTP: typeof ResendOTP;
  auth: typeof auth;
  catalog: typeof catalog;
  customers: typeof customers;
  deliveryPlaces: typeof deliveryPlaces;
  http: typeof http;
  invitations: typeof invitations;
  "lib/authorization": typeof lib_authorization;
  "lib/environment": typeof lib_environment;
  memberships: typeof memberships;
  orders: typeof orders;
  seed: typeof seed;
  stores: typeof stores;
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
