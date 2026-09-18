import type { AdminClientConfig } from "@lucidcms/admin/types";
import type { ResolvedLucidConfig } from "../../types/config.js";

/** Selects the resolved config values that are safe to expose in the admin bundle. */
const createAdminClientConfig = (
	config: Pick<ResolvedLucidConfig, "brand">,
): AdminClientConfig => ({
	brand: { name: config.brand.name },
});

export default createAdminClientConfig;
