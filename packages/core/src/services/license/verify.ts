import constants from "../../constants/constants.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import packageJson from "../../../package.json" with { type: "json" };
import { decrypt } from "../../utils/helpers/encrypt-decrypt.js";
import { getUnixTimeSeconds } from "../../utils/helpers/time.js";
import { OptionsRepository } from "../../libs/repositories/index.js";

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
	};
};

const verifyLicense: ServiceFn<
	[],
	{
		last4: string | null;
		valid: boolean;
		lastChecked: number;
		errorMessage: string | null;
	}
> = async (context) => {
	const Options = new OptionsRepository(context.db, context.config.db);
	const now = getUnixTimeSeconds();

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
		return {
			error: undefined,
			data: {
				last4: null,
				valid: false,
				lastChecked: now,
				errorMessage: T("license_is_not_set"),
			},
		};
	}

	const encryptedKey = licenseKeyRes.data?.value_text;
	const key = encryptedKey
		? decrypt(encryptedKey, context.config.keys.encryptionKey)
		: undefined;
	const last4 = key?.trim() ? key.trim().slice(-4) : null;

	if (!key?.trim()) {
		await Promise.all([
			Options.upsertSingle({
				data: {
					name: "license_valid",
					value_bool: false,
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
					value_text: T("license_is_not_set"),
				},
			}),
		]);

		return {
			error: undefined,
			data: {
				last4: null,
				valid: false,
				lastChecked: now,
				errorMessage: T("license_is_not_set"),
			},
		};
	}

	let valid: boolean | undefined;
	let errorMessage: string | null = null;

	try {
		const res = await fetch(constants.endpoints.licenseVerify, {
			method: "POST",
			headers: {
				"User-Agent": `LucidCMS/${packageJson.version}`,
				"Content-Type": "application/json",
				Origin: context.config.host.startsWith("http")
					? context.config.host
					: `https://${context.config.host}`,
			},
			body: JSON.stringify({
				licenseKey: key,
			}),
		});
		const json = (await res.json()) as VerifyAPISuccess | VerifyAPIError;

		if (!res.ok || (json as VerifyAPIError).code) {
			const err = json as VerifyAPIError;
			valid = false;
			errorMessage = err.message || T("license_verification_failed");
		} else {
			const ok = json as VerifyAPISuccess;
			valid = !!ok.data?.valid;
			errorMessage =
				ok.data.message || (valid ? null : T("license_is_invalid"));
		}
	} catch (e) {
		valid = false;
		errorMessage =
			e instanceof Error ? e.message : T("unknown_verification_error");
	}

	const [validRes, lastCheckedRes, errorMsgRes] = await Promise.all([
		Options.upsertSingle({
			data: {
				name: "license_valid",
				value_bool: valid,
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
				value_text: errorMessage,
			},
		}),
	]);
	if (validRes.error) return validRes;
	if (lastCheckedRes.error) return lastCheckedRes;
	if (errorMsgRes.error) return errorMsgRes;

	return {
		error: undefined,
		data: {
			last4,
			valid: !!valid,
			lastChecked: now,
			errorMessage,
		},
	};
};

export default verifyLicense;
