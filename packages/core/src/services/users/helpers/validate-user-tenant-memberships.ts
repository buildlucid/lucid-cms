import { copy } from "../../../libs/i18n/index.js";
import type { Config } from "../../../types/config.js";
import type { LucidErrorData } from "../../../types/errors.js";
import {
	getTenantConfig,
	multiTenancyEnabled,
} from "../../../utils/helpers/index.js";

/**
 * Validates that tenant keys exist and standard users are not left tenantless
 * when multi-tenancy is enabled.
 */
const validateUserTenantMemberships = (props: {
	config: Config;
	tenantKeys: string[];
	targetSuperAdmin: boolean;
}): LucidErrorData | undefined => {
	const unknownTenant = props.tenantKeys.find(
		(key) => getTenantConfig(props.config, key) === undefined,
	);
	if (unknownTenant !== undefined) {
		return {
			type: "basic",
			message: copy("server:core.tenants.unknown", {
				data: { key: unknownTenant },
			}),
			status: 400,
		};
	}

	if (
		multiTenancyEnabled(props.config) &&
		!props.targetSuperAdmin &&
		props.tenantKeys.length === 0
	) {
		return {
			type: "basic",
			message: copy("server:core.errors.validation.message"),
			status: 400,
			errors: {
				tenantKeys: {
					code: "invalid",
					message: copy("server:core.users.tenants.required"),
				},
			},
		};
	}

	return undefined;
};

export default validateUserTenantMemberships;
