import { createMiddleware } from "hono/factory";
import type { LucidHonoContext } from "../../../types/hono.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import { copy } from "../../i18n/index.js";

export const clientScopeCheck = (
	c: LucidHonoContext,
	requiredScopes: string[],
) => {
	const auth = c.get("clientIntegrationAuth");
	const missingScopes = requiredScopes.filter(
		(scope) => !auth.scopes.includes(scope),
	);
	const hasAllRequired = requiredScopes.every((scope) =>
		auth.scopes.includes(scope),
	);

	if (!hasAllRequired) {
		throw new LucidAPIError({
			type: "authorisation",
			name: copy("server:core.client.integrations.scopes.error.name"),
			message: copy("server:core.client.integrations.scopes.missing.message", {
				data: {
					requiredScopes: requiredScopes.join(", "),
					missingScopes: missingScopes.join(", "),
				},
			}),
			status: 403,
		});
	}
};

const clientScopes = (
	requiredScopes: string[] | ((c: LucidHonoContext) => string[]),
) =>
	createMiddleware(async (c: LucidHonoContext, next) => {
		clientScopeCheck(
			c,
			typeof requiredScopes === "function" ? requiredScopes(c) : requiredScopes,
		);
		return await next();
	});

export default clientScopes;
