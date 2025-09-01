import constants from "../../constants/constants.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import packageJson from "../../../package.json" with { type: "json" };

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

const verifyLicense: ServiceFn<[], undefined> = async (context) => {
	const licenseOptionRes = await context.services.option.getSingle(context, {
		name: "license_key",
	});
	if (licenseOptionRes.error) return licenseOptionRes;

	const key = licenseOptionRes.data.valueText;
	if (!key?.trim()) {
		await Promise.all([
			context.services.option.upsertSingle(context, {
				name: "license_valid",
				valueBool: false,
			}),
			context.services.option.upsertSingle(context, {
				name: "license_last_checked",
				valueInt: Math.trunc(Date.now() / 1000),
			}),
			context.services.option.upsertSingle(context, {
				name: "license_error_message",
				valueText: T("license_is_not_set"),
			}),
		]);

		return {
			error: undefined,
			data: undefined,
		};
	}

	let valid: boolean | undefined;
	let errorMessage: string | null = null;

	try {
		const res = await fetch(
			`${constants.endpoints.licenseVerifyTemplate}/${encodeURIComponent(key)}`,
			{
				method: "GET",
				headers: {
					"User-Agent": `LucidCMS/${packageJson.version}`,
					Origin: context.config.host.startsWith("http")
						? context.config.host
						: `https://${context.config.host}`,
				},
			},
		);
		const json = (await res.json()) as VerifyAPISuccess | VerifyAPIError;

		if (!res.ok || (json as VerifyAPIError).code) {
			const err = json as VerifyAPIError;
			valid = false;
			errorMessage = err.message || T("license_verification_failed");
		} else {
			const ok = json as VerifyAPISuccess;
			valid = !!ok.data?.valid;
			errorMessage =
				ok.data.message ||
				(valid ? T("license_verified_successfully") : T("license_is_invalid"));
		}
	} catch (e) {
		valid = false;
		errorMessage =
			e instanceof Error ? e.message : T("unknown_verification_error");
	}

	const [validRes, lastCheckedRes, errorMsgRes] = await Promise.all([
		context.services.option.upsertSingle(context, {
			name: "license_valid",
			valueBool: valid,
		}),
		context.services.option.upsertSingle(context, {
			name: "license_last_checked",
			valueInt: Math.trunc(Date.now() / 1000),
		}),
		context.services.option.upsertSingle(context, {
			name: "license_error_message",
			valueText: errorMessage,
		}),
	]);
	if (validRes.error) return validRes;
	if (lastCheckedRes.error) return lastCheckedRes;
	if (errorMsgRes.error) return errorMsgRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default verifyLicense;
