import { createMiddleware } from "hono/factory";
import T from "../../../translations/index.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import { LucidAPIError } from "../../../utils/errors/index.js";

const clientScopes = (requiredScopes: string[]) =>
	createMiddleware(async (c: LucidHonoContext, next) => {
		const auth = c.get("clientIntegrationAuth");
		const hasAllRequired = requiredScopes.every((scope) =>
			auth.scopes.includes(scope),
		);

		if (!hasAllRequired) {
			throw new LucidAPIError({
				type: "authorisation",
				name: T("client_scope_error_name"),
				message: T("client_scope_missing_message"),
				status: 403,
			});
		}

		return await next();
	});

export default clientScopes;
