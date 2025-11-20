import formatter, { licenseFormatter } from "../../libs/formatters/index.js";
import constants from "../../constants/constants.js";
import { getUnixTimeSeconds } from "../../utils/helpers/time.js";
import type { LicenseResponse } from "../../types.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { OptionsRepository } from "../../libs/repositories/index.js";
import { licenseServices } from "../index.js";

const licenseStatus: ServiceFn<[], LicenseResponse> = async (context) => {
	const Options = new OptionsRepository(context.db, context.config.db);

	const licenseOptionsRes = await Options.selectMultiple({
		select: ["name", "value_bool", "value_int", "value_text"],
		where: [
			{
				key: "name",
				operator: "in",
				value: [
					"license_valid",
					"license_last_checked",
					"license_error_message",
					"license_key_last4",
				],
			},
		],
	});
	if (licenseOptionsRes.error) return licenseOptionsRes;

	const validOpt = licenseOptionsRes.data?.find(
		(o) => o.name === "license_valid",
	);
	const lastCheckedOpt = licenseOptionsRes.data?.find(
		(o) => o.name === "license_last_checked",
	);
	const errorMsgOpt = licenseOptionsRes.data?.find(
		(o) => o.name === "license_error_message",
	);
	const licenseKeyLast4Opt = licenseOptionsRes.data?.find(
		(o) => o.name === "license_key_last4",
	);

	//* if last check older than 6 hours, trigger verify
	const nowSeconds = getUnixTimeSeconds();
	const lastCheckedSeconds = lastCheckedOpt?.value_int ?? 0;
	const recheckIntervalSeconds = constants.license.statusRecheckIntervalSeconds;

	if (
		lastCheckedSeconds &&
		nowSeconds - lastCheckedSeconds < recheckIntervalSeconds
	) {
		return {
			error: undefined,
			data: licenseFormatter.formatSingle({
				license: {
					last4: licenseKeyLast4Opt?.value_text ?? null,
					valid: formatter.formatBoolean(validOpt?.value_bool) ?? false,
					lastChecked: lastCheckedOpt?.value_int ?? null,
					errorMessage: errorMsgOpt?.value_text ?? null,
				},
			}),
		};
	}

	const verifyRes = await licenseServices.verifyLicense(context);
	if (verifyRes.error) return verifyRes;

	return {
		error: undefined,
		data: licenseFormatter.formatSingle({
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
