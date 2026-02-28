import { minutesToSeconds } from "date-fns";
import { createMiddleware } from "hono/factory";
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
import getServiceContext from "../utils/get-service-context.js";

const clientAuthentication = createMiddleware(
	async (c: LucidHonoContext, next) => {
		const apiKey = c.req.header("Authorization");
		const runtimeContext = c.get("runtimeContext");
		const connectionInfo = runtimeContext.getConnectionInfo(c);
		const userAgent = c.req.header("user-agent") || null;

		const context = getServiceContext(c);

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
		const cached = await context.kv.get<LucidClientIntegrationAuth>(cacheKey, {
			hash: true,
		});

		if (cached) {
			c.set("clientIntegrationAuth", cached);
			const response = await next();

			void clientIntegrationServices
				.updateLastUsed(context, {
					id: cached.id,
					ipAddress: connectionInfo.address ?? null,
					userAgent: userAgent,
				})
				.catch(() => undefined);

			return response;
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
		)(context, {
			apiKey: apiKey,
		});
		if (verifyApiKey.error) throw new LucidAPIError(verifyApiKey.error);

		c.set("clientIntegrationAuth", verifyApiKey.data);
		const response = await next();

		void Promise.all([
			context.kv.set(cacheKey, verifyApiKey.data, {
				expirationTtl: minutesToSeconds(5),
				hash: true,
			}),
			clientIntegrationServices.updateLastUsed(context, {
				id: verifyApiKey.data.id,
				ipAddress: connectionInfo.address ?? null,
				userAgent: userAgent,
			}),
		]).catch(() => undefined);

		return response;
	},
);

export default clientAuthentication;
