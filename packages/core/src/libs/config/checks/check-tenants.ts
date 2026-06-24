import type { Config } from "../../../types.js";
import { translate } from "../../i18n/index.js";

const checkTenantKeyReferences = (
	validTenantKeys: Set<string>,
	keys: string[],
) => {
	const unknownTenant = keys.find((key) => !validTenantKeys.has(key));
	if (unknownTenant !== undefined) {
		throw new Error(
			translate("server:core.tenants.unknown", {
				data: { key: unknownTenant },
			}),
		);
	}
};

const checkTenants = (config: Config) => {
	const tenantKeys = config.tenants.map((t) => t.key);
	const duplicate = tenantKeys.find(
		(key, index) => tenantKeys.indexOf(key) !== index,
	);
	if (duplicate !== undefined) {
		throw new Error(
			translate("server:core.config.duplicate.tenant", {
				data: { key: duplicate },
			}),
		);
	}

	const defaultTenants = config.tenants.filter((tenant) => tenant.default);
	if (defaultTenants.length > 1) {
		throw new Error(
			translate("server:core.config.duplicate.default.tenant", {
				data: { keys: defaultTenants.map((tenant) => tenant.key).join(", ") },
			}),
		);
	}

	const validTenantKeys = new Set(tenantKeys);
	for (const collection of config.collections) {
		checkTenantKeyReferences(validTenantKeys, collection.getData.tenants);

		for (const brick of collection.brickInstances) {
			checkTenantKeyReferences(validTenantKeys, brick.config.tenants);
		}
	}
};

export default checkTenants;
