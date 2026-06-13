import type { Config } from "../../types/config.js";

/**
 * Multi-tenancy is opt-in: it is enabled when one or more tenants are configured.
 */
export const multiTenancyEnabled = (config: Config) =>
	config.tenants.length > 0;

export const getTenantConfig = (config: Config, key: string) =>
	config.tenants.find((tenant) => tenant.key === key);

export const tenantAccessAllowed = (
	tenantKeys: string[] | undefined,
	tenantKey: string | null | undefined,
) => {
	if (tenantKeys === undefined || tenantKeys.length === 0) return true;
	if (tenantKey == null) return true;
	return tenantKeys.includes(tenantKey);
};
