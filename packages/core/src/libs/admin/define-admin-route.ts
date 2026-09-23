import type { AdminRoute } from "@lucidcms/admin/types";

/**
 * Defines an admin route rendered at `/lucid/e/<path>`. Add it to `config.admin.routes`.
 * Relative component paths resolve from lucid.config.
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
const defineAdminRoute = (route: AdminRoute): AdminRoute => route;

export default defineAdminRoute;
