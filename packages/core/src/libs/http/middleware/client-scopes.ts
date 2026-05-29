import { createMiddleware } from "hono/factory";
import type { LucidHonoContext } from "../../../types/hono.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import { text } from "../../i18n/index.js";

const clientScopes = (requiredScopes: string[]) =>
	createMiddleware(async (c: LucidHonoContext, next) => {
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
				name: text.server("core.client.integrations.scopes.error.name"),
				message: text.server(
					"core.client.integrations.scopes.missing.message",
					{
						data: {
							requiredScopes: requiredScopes.join(", "),
							missingScopes: missingScopes.join(", "),
						},
					},
				),
				status: 403,
			});
		}

		return await next();
	});

export default clientScopes;
