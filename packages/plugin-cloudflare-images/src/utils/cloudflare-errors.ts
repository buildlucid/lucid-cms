const VALIDATION_CODES = new Set([9401, 9402, 9412, 9413, 9520, 9522, 9523]);
const CONFIGURATION_CODES = new Set([9422, 9432]);
const TRANSIENT_CODES = new Set([9424, 9516, 9517, 9518, 9529]);

type CloudflareErrorDetails =
	| {
			category: "validation" | "configuration" | "transient";
			code: number;
	  }
	| { category: "unknown"; code: undefined };

const getErrorCode = (error: unknown): number | undefined => {
	if (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		typeof error.code === "number"
	) {
		return error.code;
	}
	return undefined;
};

/** Classifies the documented Images binding errors used by plugin copy. */
export const getCloudflareErrorDetails = (
	error: unknown,
): CloudflareErrorDetails => {
	const code = getErrorCode(error);
	if (code !== undefined && VALIDATION_CODES.has(code)) {
		return { category: "validation", code };
	}
	if (code !== undefined && CONFIGURATION_CODES.has(code)) {
		return { category: "configuration", code };
	}
	if (code !== undefined && TRANSIENT_CODES.has(code)) {
		return { category: "transient", code };
	}
	return { category: "unknown", code: undefined };
};

/** Reads an Images error code from a non-success binding response. */
export const getResponseErrorCode = (
	response: Response,
): number | undefined => {
	const value = response.headers.get("cf-images-binding");
	const match = value?.match(/(?:^|;)\s*err=(\d+)/);
	return match?.[1] ? Number(match[1]) : undefined;
};
