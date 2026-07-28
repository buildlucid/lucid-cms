import { createMiddleware } from "hono/factory";
import type { ExternalScope } from "../../../libs/permission/external-scopes.js";
import { getOAuthUrls } from "../../../services/oauth/helpers/urls.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import { copy } from "../../i18n/index.js";
import createServiceContext from "../utils/create-service-context.js";

/** Throws when the current external credential lacks a required scope. */
export const externalScopeCheck = (
	c: LucidHonoContext,
	requiredScopes: ExternalScope[],
) => {
	const auth = c.get("externalAuth");
	const missingScopes = requiredScopes.filter(
		(scope) => !auth.scopes.includes(scope),
	);

	if (missingScopes.length > 0) {
		if (auth.credential.type === "oauth") {
			c.header(
				"WWW-Authenticate",
				[
					`Bearer resource_metadata="${getOAuthUrls(createServiceContext(c)).protectedResourceMetadata}"`,
					'error="insufficient_scope"',
					`scope="${requiredScopes.join(" ")}"`,
				].join(", "),
			);
		}
		throw new LucidAPIError({
			type: "forbidden",
			name: copy("server:core.integrations.scopes.error.name"),
			message: copy("server:core.integrations.scopes.missing.message", {
				data: {
					requiredScopes: requiredScopes.join(", "),
					missingScopes: missingScopes.join(", "),
				},
			}),
			status: 403,
		});
	}
};

const externalScopes = (
	requiredScopes: ExternalScope[] | ((c: LucidHonoContext) => ExternalScope[]),
) =>
	createMiddleware(async (c: LucidHonoContext, next) => {
		externalScopeCheck(
			c,
			typeof requiredScopes === "function" ? requiredScopes(c) : requiredScopes,
		);
		return await next();
	});

export default externalScopes;
