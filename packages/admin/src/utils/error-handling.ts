import type { ErrorResponse } from "@types";
import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";

/**
 * An error from the Lucid API. `errorRes` holds the status and any field errors.
 *
 * @example
 * ```ts
 * import { LucidError } from "@lucidcms/admin/services";
 *
 * if (error instanceof LucidError && error.errorRes.status === 404) {
 * 	navigate("/lucid/redirects");
 * }
 * ```
 */
export class LucidError extends Error {
	errorRes: ErrorResponse;
	constructor(message: string, errorRes: ErrorResponse) {
		super(message);
		this.name = this.constructor.name;
		// Error.captureStackTrace(this, this.constructor);
		this.errorRes = errorRes;
	}
}

/**
 * A resource is treated as inaccessible when the request fails with a
 * not-found or forbidden status.
 */
export const isInaccessibleError = (error: unknown) => {
	if (error instanceof LucidError) {
		return error.errorRes.status === 403 || error.errorRes.status === 404;
	}
	return false;
};

export const validateSetError = (error: unknown) => {
	// console.error(error);
	if (error instanceof LucidError) {
		return error.errorRes;
	}
	return {
		status: 500,
		name: T()("common.error"),
		message: T()("errors.unknown.message"),
		errors: {},
	};
};

export const handleSiteErrors = (error: ErrorResponse) => {
	spawnToast({
		title: error.name,
		message: error.message,
		status: "error",
	});
};

export const emptyBodyError = () => {
	spawnToast({
		title: T()("common.error"),
		message: T()("errors.empty.body.message"),
		status: "error",
	});
};
