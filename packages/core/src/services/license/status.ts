import Formatter from "../../libs/formatters/index.js";
import constants from "../../constants/constants.js";
import { getUnixTimeSeconds } from "../../utils/helpers/time.js";
import type { LicenseResponse } from "../../types.js";
import type { ServiceFn } from "../../utils/services/types.js";

const licenseStatus: ServiceFn<[], LicenseResponse> = async (context) => {
	const LicenseFormatter = Formatter.get("license");

	const res = await context.services.option.getMultiple(context, {
		names: [
			"license_valid",
			"license_last_checked",
			"license_error_message",
			"license_key_last4",
		],
	});
	if (res.error) return res;

	const validOpt = res.data.find((o) => o.name === "license_valid");
	const lastCheckedOpt = res.data.find(
		(o) => o.name === "license_last_checked",
	);
	const errorMsgOpt = res.data.find((o) => o.name === "license_error_message");
	const licenseKeyLast4Opt = res.data.find(
		(o) => o.name === "license_key_last4",
	);

	//* if last check older than 6 hours, trigger verify
	const nowSeconds = getUnixTimeSeconds();
	const lastCheckedSeconds = lastCheckedOpt?.valueInt ?? 0;
	const recheckIntervalSeconds = constants.license.statusRecheckIntervalSeconds;

	if (
		lastCheckedSeconds &&
		nowSeconds - lastCheckedSeconds < recheckIntervalSeconds
	) {
		return {
			error: undefined,
			data: LicenseFormatter.formatSingle({
				license: {
					last4: licenseKeyLast4Opt?.valueText ?? null,
					valid: validOpt?.valueBool ?? false,
					lastChecked: lastCheckedOpt?.valueInt ?? null,
					errorMessage: errorMsgOpt?.valueText ?? null,
				},
			}),
		};
	}

	const verifyRes = await context.services.license.verifyLicense(context);
	if (verifyRes.error) return verifyRes;

	return {
		error: undefined,
		data: LicenseFormatter.formatSingle({
			license: {
				last4: verifyRes.data.last4,
				valid: verifyRes.data.valid,
				lastChecked: verifyRes.data.lastChecked,
				errorMessage: verifyRes.data.errorMessage,
			},
		}),
	};
};

export default licenseStatus;
