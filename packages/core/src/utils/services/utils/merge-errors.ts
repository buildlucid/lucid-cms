import T from "../../../translations/index.js";
import errorTypeDefaults from "../../errors/error-type-defaults.js";
import type { LucidErrorData } from "../../../types/errors.js";

const mergeServiceError = (
	error: LucidErrorData,
	defaultError?: Omit<Partial<LucidErrorData>, "zod" | "errors">,
): LucidErrorData => {
	const errorTypeRes = errorTypeDefaults(error);
	error.status = errorTypeRes.status;
	error.name = errorTypeRes.name;
	error.message = errorTypeRes.message;

	return {
		type: error.type ?? defaultError?.type ?? "basic",
		name: error.name ?? defaultError?.name ?? T("unknown_service_error"),
		message:
			error.message ??
			defaultError?.message ??
			T("unknown_service_error_message"),
		status: error.status ?? defaultError?.status ?? 500,
		code: error.code ?? defaultError?.code ?? undefined,
		zod: error.zod ?? undefined,
		errors: error.errors ?? undefined,
	};
};

export default mergeServiceError;
