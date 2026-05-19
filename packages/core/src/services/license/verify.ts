import packageJson from "../../../package.json" with { type: "json" };
import constants from "../../constants/constants.js";
import formatter, { licenseFormatter } from "../../libs/formatters/index.js";
import { OptionsRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import { decrypt } from "../../utils/helpers/encrypt-decrypt.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import { getUnixTimeSeconds } from "../../utils/helpers/time.js";
import type { ServiceFn } from "../../utils/services/types.js";

type VerifyAPIError = {
	status: number;
	code:
		| "VALIDATION_ERROR"
		| "INTERNAL_SERVER_ERROR"
		| "UNAUTHORIZED"
		| "FORBIDDEN"
		| "NOT_FOUND"
		| "CONFLICT"
		| "BAD_REQUEST";
	message: string;
	details?: Record<string, unknown>;
};

type VerifyAPISuccess = {
	data: {
		valid: boolean;
		message?: string;
		ai?: {
			enabled?: boolean;
		};
	};
};

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
			errorMessage: T("license_is_not_set"),
		});
		if (persistRes.error) return persistRes;

		return {
			error: undefined,
			data: {
				key: null,
				valid: false,
				lastChecked: now,
				errorMessage: T("license_is_not_set"),
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
			errorMessage: T("license_is_not_set"),
		});
		if (persistRes.error) return persistRes;

		return {
			error: undefined,
			data: {
				key: null,
				valid: false,
				lastChecked: now,
				errorMessage: T("license_is_not_set"),
				aiEnabled: false,
			},
		};
	}

	let snapshot: LicenseSnapshot;

	try {
		const baseUrl = getBaseUrl(context);
		const res = await fetch(constants.endpoints.licenseVerify, {
			method: "POST",
			headers: {
				"User-Agent": `LucidCMS/${packageJson.version}`,
				"Content-Type": "application/json",
				Origin: baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`,
			},
			body: JSON.stringify({
				licenseKey: key,
			}),
		});
		const json = (await res.json()) as VerifyAPISuccess | VerifyAPIError;

		if (!res.ok || (json as VerifyAPIError).code) {
			const err = json as VerifyAPIError;
			snapshot =
				res.status >= 500
					? {
							...existingSnapshot,
							errorMessage: err.message || T("license_verification_failed"),
						}
					: {
							valid: false,
							aiEnabled: false,
							errorMessage: err.message || T("license_verification_failed"),
						};
		} else {
			const ok = json as VerifyAPISuccess;
			const valid = !!ok.data?.valid;
			snapshot = {
				valid,
				aiEnabled: valid ? !!ok.data.ai?.enabled : false,
				errorMessage:
					ok.data.message || (valid ? null : T("license_is_invalid")),
			};
		}
	} catch (e) {
		snapshot = {
			...existingSnapshot,
			errorMessage:
				e instanceof Error ? e.message : T("unknown_verification_error"),
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
