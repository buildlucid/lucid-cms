import type { ErrorResponse } from "@types";
import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";

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
 * not-found or forbidden status - e.g. the document/collection does not
 * exist for the currently active tenant.
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
