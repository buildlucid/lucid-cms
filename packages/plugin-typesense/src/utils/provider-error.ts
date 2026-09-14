import { copy } from "@lucidcms/core";
import type { LucidErrorData } from "@lucidcms/core/types";
import { Errors } from "typesense";

/** SDK exceptions can contain credentials or document bodies. Keep only the HTTP status. */
const providerError = (error: unknown): LucidErrorData => ({
	message:
		error instanceof Errors.TypesenseError && error.httpStatus
			? copy("server:plugin.typesense.provider.http.failed", {
					data: { status: error.httpStatus },
				})
			: copy("server:plugin.typesense.provider.failed"),
});

export default providerError;
