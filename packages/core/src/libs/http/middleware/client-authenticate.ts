import T from "../../../translations/index.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import { createMiddleware } from "hono/factory";
import services from "../../../services/index.js";
import type { LucidHonoContext } from "../../../types/hono.js";

const clientAuthentication = createMiddleware(
	async (c: LucidHonoContext, next) => {
		const apiKey = c.req.header("Authorization");
		const config = c.get("config");

		if (!apiKey) {
			throw new LucidAPIError({
				type: "authorisation",
				message: T("client_integration_api_key_missing"),
				status: 401,
			});
		}

		const verifyApiKey = await serviceWrapper(
			services.clientIntegrations.verifyApiKey,
			{
				transaction: false,
				defaultError: {
					type: "authorisation",
					message: T("client_integration_error"),
					status: 401,
				},
			},
		)(
			{
				db: config.db.client,
				config: config,
				queue: c.get("queue"),
				env: c.get("env"),
			},
			{
				apiKey: apiKey,
			},
		);
		if (verifyApiKey.error) throw new LucidAPIError(verifyApiKey.error);

		c.set("clientIntegrationAuth", verifyApiKey.data);

		return await next();
	},
);

export default clientAuthentication;
