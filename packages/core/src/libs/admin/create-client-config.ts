import type { AdminClientConfig } from "@lucidcms/admin/types";
import type { ResolvedLucidConfig } from "../../types/config.js";

/** Selects the resolved config values that are safe to expose in the admin bundle. */
const createAdminClientConfig = (
	config: Pick<ResolvedLucidConfig, "brand" | "admin" | "deploys">,
): AdminClientConfig => ({
	brand: { name: config.brand.name },
	agentHomescreen: config.admin.agentHomescreen,
	deploys: config.deploys.map((deploy) => deploy.key),
});

export default createAdminClientConfig;
