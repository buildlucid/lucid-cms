import { copy } from "../../../libs/i18n/index.js";
import { getMediaKeyTenantKey } from "../../../utils/media/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Confirms a media key belongs to the requested tenant when one is selected.
 * Global keys are tenantless, so they remain available to tenant requests.
 */
const checkMediaKeyAccess: ServiceFn<
	[
		{
			key: string;
		},
	],
	undefined
> = async (context, data) => {
	const requestTenantKey = context.request.tenantKey;
	if (requestTenantKey == null) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const mediaTenantKey = getMediaKeyTenantKey(data.key);
	if (mediaTenantKey !== null && mediaTenantKey !== requestTenantKey) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.media.not.found.message"),
				status: 404,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default checkMediaKeyAccess;
