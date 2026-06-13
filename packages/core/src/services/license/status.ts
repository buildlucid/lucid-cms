import constants from "../../constants/constants.js";
import formatter, { licenseFormatter } from "../../libs/formatters/index.js";
import { OptionsRepository } from "../../libs/repositories/index.js";
import type { License } from "../../types.js";
import { getUnixTimeSeconds } from "../../utils/helpers/time.js";
import type { ServiceFn } from "../../utils/services/types.js";
import {
	getLicenseOptionBaseName,
	getLicenseOptionNames,
} from "./helpers/option-names.js";
import verifyLicense from "./verify.js";

const licenseStatus: ServiceFn<[], License> = async (context) => {
	const Options = new OptionsRepository(context.db.client, context.config.db);

	const tenantKey = context.request.tenantKey ?? null;

	const licenseOptionsRes = await Options.selectMultiple({
		select: ["name", "value_bool", "value_int", "value_text"],
		where: [
			{
				key: "name",
				operator: "in",
				value: getLicenseOptionNames(tenantKey, [
					"license_valid",
					"license_last_checked",
					"license_error_message",
					"license_key_display",
					"license_ai_enabled",
				]),
			},
		],
	});
	if (licenseOptionsRes.error) return licenseOptionsRes;

	const validOpt = licenseOptionsRes.data?.find(
		(o) => getLicenseOptionBaseName(o.name) === "license_valid",
	);
	const lastCheckedOpt = licenseOptionsRes.data?.find(
		(o) => getLicenseOptionBaseName(o.name) === "license_last_checked",
	);
	const errorMsgOpt = licenseOptionsRes.data?.find(
		(o) => getLicenseOptionBaseName(o.name) === "license_error_message",
	);
	const licenseKeyDisplayOpt = licenseOptionsRes.data?.find(
		(o) => getLicenseOptionBaseName(o.name) === "license_key_display",
	);
	const aiEnabledOpt = licenseOptionsRes.data?.find(
		(o) => getLicenseOptionBaseName(o.name) === "license_ai_enabled",
	);
	const lastChecked = lastCheckedOpt?.value_int ?? null;
	const now = getUnixTimeSeconds();

	if (
		lastChecked === null ||
		now - lastChecked >= constants.license.statusRecheckIntervalSeconds
	) {
		const verifyRes = await verifyLicense(context, {
			tenantKey,
		});
		if (verifyRes.error) return verifyRes;

		return {
			error: undefined,
			data: licenseFormatter.formatSingle({
				license: {
					key: verifyRes.data.key,
					valid: verifyRes.data.valid,
					lastChecked: verifyRes.data.lastChecked,
					errorMessage: verifyRes.data.errorMessage,
					aiEnabled: verifyRes.data.aiEnabled,
				},
			}),
		};
	}

	return {
		error: undefined,
		data: licenseFormatter.formatSingle({
			license: {
				key: licenseKeyDisplayOpt?.value_text ?? null,
				valid: formatter.formatBoolean(validOpt?.value_bool) ?? false,
				lastChecked,
				errorMessage: errorMsgOpt?.value_text ?? null,
				aiEnabled: formatter.formatBoolean(aiEnabledOpt?.value_bool) ?? false,
			},
		}),
	};
};

export default licenseStatus;
