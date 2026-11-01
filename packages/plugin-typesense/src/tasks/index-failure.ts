import type { LucidErrorData, ServiceContext } from "@lucidcms/core/types";
import type { IndexTaskResult } from "./types.js";

/** An index's failed task result, with the error in English for the terminal. */
const indexFailure = (
	context: ServiceContext,
	index: string,
	error: LucidErrorData,
): IndexTaskResult => ({
	index,
	status: null,
	error: context.translate.english(error.message) ?? "Unknown error",
});

export default indexFailure;
