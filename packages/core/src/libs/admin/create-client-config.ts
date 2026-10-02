import type { AdminClientConfig } from "@lucidcms/admin/types";
import type { ResolvedLucidConfig } from "../../types/config.js";

/** Selects the resolved config values that are safe to expose in the admin bundle. */
const createAdminClientConfig = (
	config: Pick<ResolvedLucidConfig, "brand" | "admin">,
): AdminClientConfig => ({
	brand: { name: config.brand.name },
	agentHomescreen: config.admin.agentHomescreen,
});

export default createAdminClientConfig;
