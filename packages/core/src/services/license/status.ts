import Formatter from "../../libs/formatters/index.js";
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
};

export default licenseStatus;
