import type { AdminRoute } from "@lucidcms/admin/types";
import type { ExactDefinition } from "./types.js";

/**
 * Defines an admin route rendered at `/admin/e/<path>`. Add it to `config.admin.routes`.
 * Relative component paths resolve from lucid.config. Type the component with
 * `RouteComponent<typeof reportsRoute>`, so its options follow this definition.
 *
 * @example
 * ```ts
 * const reportsRoute = defineAdminRoute({
 * 	key: "reports",
 * 	path: "reports",
 * 	component: "./src/admin/Reports.tsx",
 * 	navigation: { label: "Reports", icon: "overview" },
 * });
 * ```
 */
const defineAdminRoute = <const TRoute extends AdminRoute>(
	route: ExactDefinition<TRoute, AdminRoute>,
): TRoute => route;

export default defineAdminRoute;
