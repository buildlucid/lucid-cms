import { minutesToSeconds } from "date-fns";
import { createMiddleware } from "hono/factory";
import { clientIntegrationServices } from "../../../services/index.js";
import type {
	LucidClientIntegrationAuth,
	LucidHonoContext,
} from "../../../types/hono.js";
import { decodeApiKey } from "../../../utils/client-integrations/encode-api-key.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import { multiTenancyEnabled } from "../../../utils/helpers/index.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import { copy } from "../../i18n/index.js";
import cacheKeys from "../../kv/cache-keys.js";
import createServiceContext from "../utils/create-service-context.js";

const clientAuthentication = createMiddleware(
	async (c: LucidHonoContext, next) => {
		const apiKey = c.req.header("Authorization");
		const runtimeContext = c.get("runtimeContext");
		const connectionInfo = runtimeContext.getConnectionInfo(c);
		const userAgent = c.req.header("user-agent") || null;

		const context = createServiceContext(c);

		if (!apiKey) {
			throw new LucidAPIError({
				type: "authorisation",
				message: copy("server:core.client.integrations.api.key.missing"),
				status: 401,
			});
		}

		const { key: decodedKey } = decodeApiKey(apiKey);
		if (!decodedKey) {
			throw new LucidAPIError({
				message: copy("server:core.client.integrations.key.missing"),
			});
		}

		const cacheKey = cacheKeys.auth.client(decodedKey);
		const cached = await context.kv.get<LucidClientIntegrationAuth>(context, {
			key: cacheKey,
			hash: true,
		});

		if (cached) {
			const tenantKey = multiTenancyEnabled(c.get("config"))
				? cached.tenantKey
				: null;
			c.set("clientIntegrationAuth", cached);
			c.set("tenant", tenantKey ? { key: tenantKey } : null);
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
					message: copy("server:core.client.integrations.error"),
					status: 401,
				},
			},
		)(context, {
			apiKey: apiKey,
		});
		if (verifyApiKey.error) throw new LucidAPIError(verifyApiKey.error);

		const tenantKey = multiTenancyEnabled(c.get("config"))
			? verifyApiKey.data.tenantKey
			: null;
		c.set("clientIntegrationAuth", verifyApiKey.data);
		c.set("tenant", tenantKey ? { key: tenantKey } : null);
		const response = await next();

		void Promise.all([
			context.kv.set(context, {
				key: cacheKey,
				value: verifyApiKey.data,
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
