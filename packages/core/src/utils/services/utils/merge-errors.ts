import { text } from "../../../libs/i18n/index.js";
import type { LucidErrorData } from "../../../types/errors.js";
import errorTypeDefaults from "../../errors/error-type-defaults.js";

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
		name:
			error.name ??
			defaultError?.name ??
			text.server("core.services.errors.unknown.name"),
		message:
			error.message ??
			defaultError?.message ??
			text.server("core.services.errors.unknown.message"),
		status: error.status ?? defaultError?.status ?? 500,
		code: error.code ?? defaultError?.code ?? undefined,
		zod: error.zod ?? undefined,
		errors: error.errors ?? undefined,
		cause: error.cause ?? defaultError?.cause ?? undefined,
	};
};

export default mergeServiceError;
