import { multiTenancyEnabled } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import verifyLicense from "../license/verify.js";

/**
 * Revalidates the license for each configured tenant, or once globally when tenants are off.
 */
const verifyLicenseCron: ServiceFn<[], undefined> = async (context) => {
	if (multiTenancyEnabled(context.config)) {
		for (const tenant of context.config.tenants) {
			const verifyRes = await verifyLicense(context, {
				tenantKey: tenant.key,
			});
			if (verifyRes.error) return verifyRes;
		}

		return {
			error: undefined,
			data: undefined,
		};
	}

	const verifyRes = await verifyLicense(context, {
		tenantKey: null,
	});
	if (verifyRes.error) return verifyRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default verifyLicenseCron;
