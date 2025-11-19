import { createMiddleware } from "hono/factory";
import constants from "../../../constants/constants.js";
import { clientIntegrationServices } from "../../../services/index.js";
import T from "../../../translations/index.js";
import type {
	LucidClientIntegrationAuth,
	LucidHonoContext,
} from "../../../types/hono.js";
import { decodeApiKey } from "../../../utils/client-integrations/encode-api-key.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import cacheKeys from "../../kv-adapter/cache-keys.js";

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
		const cached = await kv.command.get<LucidClientIntegrationAuth>(cacheKey);

		if (cached) {
			c.set("clientIntegrationAuth", cached);
			return await next();
		}

		const verifyApiKey = await serviceWrapper(
			clientIntegrationServices.verifyApiKey,
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

		await kv.command.set(cacheKey, verifyApiKey.data, {
			expirationTtl: constants.ttl["5-minutes"],
		});

		c.set("clientIntegrationAuth", verifyApiKey.data);
		return await next();
	},
);

export default clientAuthentication;
