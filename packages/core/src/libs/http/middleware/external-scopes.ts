import { createMiddleware } from "hono/factory";
import type { ExternalScope } from "../../../libs/permission/external-scopes.js";
import {
	getOAuthUrls,
	type OAuthResource,
} from "../../../services/oauth/helpers/urls.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import { copy } from "../../i18n/index.js";
import { filterExternalScopes } from "../../permission/scopes.js";
import createServiceContext from "../utils/create-service-context.js";

/** Throws when the current external credential lacks a required scope. */
export const externalScopeCheck = (
	c: LucidHonoContext,
	requiredScopes: readonly ExternalScope[],
	options: { resource?: OAuthResource } = {},
) => {
	const auth = c.get("externalAuth");
	const effectiveScopes = filterExternalScopes(
		c.get("config"),
		auth.scopes,
		auth.principal.type,
	);
	const missingScopes = requiredScopes.filter(
		(scope) => !effectiveScopes.includes(scope),
	);

	if (missingScopes.length > 0) {
		if (auth.credential.type === "oauth") {
			const { resources } = getOAuthUrls(createServiceContext(c));
			c.header(
				"WWW-Authenticate",
				[
					`Bearer resource_metadata="${resources[options.resource ?? "content"].metadata}"`,
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

/** Requires every supplied scope. Register external authentication first. */
const externalScopes = (
	requiredScopes:
		| readonly ExternalScope[]
		| ((c: LucidHonoContext) => readonly ExternalScope[]),
	options: { resource?: OAuthResource } = {},
) =>
	createMiddleware(async (c: LucidHonoContext, next) => {
		externalScopeCheck(
			c,
			typeof requiredScopes === "function" ? requiredScopes(c) : requiredScopes,
			options,
		);
		return await next();
	});

export default externalScopes;
