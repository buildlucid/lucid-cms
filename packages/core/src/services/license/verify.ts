import formatter, { licenseFormatter } from "../../libs/formatters/index.js";
import { verifyCmsLicense } from "../../libs/lucid-remote/services/index.js";
import { OptionsRepository } from "../../libs/repositories/index.js";
import { decrypt } from "../../utils/helpers/encrypt-decrypt.js";
import { getUnixTimeSeconds } from "../../utils/helpers/time.js";
import type { ServiceFn } from "../../utils/services/types.js";

type LicenseSnapshot = {
	valid: boolean;
	aiEnabled: boolean;
	errorMessage: string | null;
};

const verifyLicense: ServiceFn<
	[],
	{
		key: string | null;
		valid: boolean;
		lastChecked: number;
		errorMessage: string | null;
		aiEnabled: boolean;
	}
> = async (context) => {
	const Options = new OptionsRepository(context.db.client, context.config.db);
	const now = getUnixTimeSeconds();

	const existingStateRes = await Options.selectMultiple({
		select: ["name", "value_bool", "value_text"],
		where: [
			{
				key: "name",
				operator: "in",
				value: ["license_valid", "license_error_message", "license_ai_enabled"],
			},
		],
	});
	if (existingStateRes.error) return existingStateRes;

	const existingSnapshot: LicenseSnapshot = {
		valid:
			formatter.formatBoolean(
				existingStateRes.data?.find((o) => o.name === "license_valid")
					?.value_bool,
			) ?? false,
		aiEnabled:
			formatter.formatBoolean(
				existingStateRes.data?.find((o) => o.name === "license_ai_enabled")
					?.value_bool,
			) ?? false,
		errorMessage:
			existingStateRes.data?.find((o) => o.name === "license_error_message")
				?.value_text ?? null,
	};

	const persistSnapshot = async (snapshot: LicenseSnapshot) => {
		const [validRes, lastCheckedRes, errorMsgRes, aiEnabledRes] =
			await Promise.all([
				Options.upsertSingle({
					data: {
						name: "license_valid",
						value_bool: snapshot.valid,
					},
				}),
				Options.upsertSingle({
					data: {
						name: "license_last_checked",
						value_int: now,
					},
				}),
				Options.upsertSingle({
					data: {
						name: "license_error_message",
						value_text: snapshot.errorMessage,
					},
				}),
				Options.upsertSingle({
					data: {
						name: "license_ai_enabled",
						value_bool: snapshot.aiEnabled,
					},
				}),
			]);
		if (validRes.error) return validRes;
		if (lastCheckedRes.error) return lastCheckedRes;
		if (errorMsgRes.error) return errorMsgRes;
		if (aiEnabledRes.error) return aiEnabledRes;

		return {
			error: undefined,
			data: undefined,
		};
	};
	const licenseKeyRes = await Options.selectSingle({
		select: ["name", "value_text"],
		where: [
			{
				key: "name",
				operator: "=",
				value: "license_key",
			},
		],
	});
	if (licenseKeyRes.error) return licenseKeyRes;

	if (!licenseKeyRes.data) {
		const persistRes = await persistSnapshot({
			valid: false,
			aiEnabled: false,
			errorMessage: context.translate("server:core.license.is.not.set"),
		});
		if (persistRes.error) return persistRes;

		return {
			error: undefined,
			data: {
				key: null,
				valid: false,
				lastChecked: now,
				errorMessage: context.translate("server:core.license.is.not.set"),
				aiEnabled: false,
			},
		};
	}

	const encryptedKey = licenseKeyRes.data?.value_text;
	const key = encryptedKey
		? decrypt(encryptedKey, context.config.secrets.encryption)
		: undefined;
	const displayKey = licenseFormatter.createLicenseKeyDisplay(key);

	if (!key?.trim()) {
		const persistRes = await persistSnapshot({
			valid: false,
			aiEnabled: false,
			errorMessage: context.translate("server:core.license.is.not.set"),
		});
		if (persistRes.error) return persistRes;

		return {
			error: undefined,
			data: {
				key: null,
				valid: false,
				lastChecked: now,
				errorMessage: context.translate("server:core.license.is.not.set"),
				aiEnabled: false,
			},
		};
	}

	let snapshot: LicenseSnapshot;

	const verifyRes = await verifyCmsLicense(context, {
		licenseKey: key,
	});

	if (verifyRes.error) {
		const errorMessage =
			context.translate(verifyRes.error.message) ||
			context.translate("server:core.license.verification.failed");
		snapshot = {
			...existingSnapshot,
			errorMessage,
		};
	} else {
		const ok = verifyRes.data.json.data;
		const valid = !!ok.valid;
		snapshot = {
			valid,
			aiEnabled: valid && ok.ai.enabled,
			errorMessage:
				ok.message ||
				(valid ? null : context.translate("server:core.license.is.invalid")),
		};
	}

	const persistRes = await persistSnapshot(snapshot);
	if (persistRes.error) return persistRes;

	return {
		error: undefined,
		data: {
			key: displayKey,
			valid: snapshot.valid,
			lastChecked: now,
			errorMessage: snapshot.errorMessage,
			aiEnabled: snapshot.aiEnabled,
		},
	};
};

export default verifyLicense;
