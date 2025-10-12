import T from "../../../translations/index.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import { createMiddleware } from "hono/factory";
import services from "../../../services/index.js";
import type {
	LucidClientIntegrationAuth,
	LucidHonoContext,
} from "../../../types/hono.js";
import cacheKeys from "../../kv/cache-keys.js";
import { decodeApiKey } from "../../../utils/client-integrations/encode-api-key.js";

const clientAuthentication = createMiddleware(
	async (c: LucidHonoContext, next) => {
		const apiKey = c.req.header("Authorization");
		const config = c.get("config");
		const kv = c.get("kv");

		if (!apiKey) {
			throw new LucidAPIError({
				type: "authorisation",
				message: T("client_integration_api_key_missing"),
				status: 401,
			});
		}

		const { key: decodedKey } = decodeApiKey(apiKey);
		if (!decodedKey) {
			throw new LucidAPIError({
				message: T("client_integration_key_missing"),
			});
		}

		const cacheKey = cacheKeys.auth.client(decodedKey);
		const cached = await kv.get<LucidClientIntegrationAuth>(cacheKey);

		if (cached) {
			c.set("clientIntegrationAuth", cached);
			return await next();
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
				kv: kv,
			},
			{
				apiKey: apiKey,
			},
		);
		if (verifyApiKey.error) throw new LucidAPIError(verifyApiKey.error);

		await kv.set(cacheKey, verifyApiKey.data, {
			expirationTtl: 300,
		});

		c.set("clientIntegrationAuth", verifyApiKey.data);
		return await next();
	},
);

export default clientAuthentication;
