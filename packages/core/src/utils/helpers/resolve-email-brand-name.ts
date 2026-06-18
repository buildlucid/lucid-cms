import type { TranslateCopy } from "../../libs/i18n/index.js";
import type { Config } from "../../types/config.js";

/**
 * Resolves the display brand name for emails, preferring the active request
 * tenant name when tenant-scoped and falling back to the global brand name.
 */
const resolveEmailBrandName = (props: {
	config: Pick<Config, "brand" | "tenants">;
	translate: TranslateCopy;
	tenantKey?: string | null;
}) => {
	if (props.tenantKey) {
		const tenant = props.config.tenants.find(
			(configTenant) => configTenant.key === props.tenantKey,
		);
		const tenantName = props.translate(tenant?.name)?.trim();
		if (tenantName) return tenantName;
	}

	const brandName = props.config.brand?.name?.trim();
	if (brandName) return brandName;

	return undefined;
};

export default resolveEmailBrandName;
