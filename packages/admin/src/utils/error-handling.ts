import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";
import type { ErrorResponse } from "@types";

export class LucidError extends Error {
	errorRes: ErrorResponse;
	constructor(message: string, errorRes: ErrorResponse) {
		super(message);
		this.name = this.constructor.name;
		// Error.captureStackTrace(this, this.constructor);
		this.errorRes = errorRes;
	}
}

export const validateSetError = (error: unknown) => {
	// console.error(error);
	if (error instanceof LucidError) {
		return error.errorRes;
	}
	return {
		status: 500,
		name: T()("error"),
		message: T()("unknown_error_message"),
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
		title: T()("error"),
		message: T()("empty_body_error_message"),
		status: "error",
	});
};
