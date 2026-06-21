import constants from "../../../constants/constants.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import { createTranslator, resolveInterfaceLocale } from "../../i18n/index.js";

/**
 * A helper to build the service context from a Hono context.
 */
const createServiceContext = (c: LucidHonoContext): ServiceContext => {
	const connectionInfo = c.get("runtimeContext").getConnectionInfo(c);
	const config = c.get("config");
	const env = c.get("env");
	const runtimeContext = c.get("runtimeContext");
	const db = { client: config.db.client };

	const locale = resolveInterfaceLocale({
		config,
		locale: c.req.header(constants.headers.interfaceLocale),
		acceptLanguage: c.req.header("Accept-Language"),
	});
	const request = {
		url: c.req.url,
		ipAddress: connectionInfo.address ?? null,
		locale,
		tenantKey: c.get("tenant")?.key ?? null,
	};

	return {
		db,
		config,
		queue: c.get("queue"),
		env,
		runtimeContext,
		kv: c.get("kv"),
		media: c.get("media"),
		email: c.get("email"),
		translate: createTranslator({ store: c.get("translationStore"), locale }),
		request,
	};
};

export default createServiceContext;
