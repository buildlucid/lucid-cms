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

	const locale = resolveInterfaceLocale({
		config,
		locale: c.req.header(constants.headers.interfaceLocale),
		acceptLanguage: c.req.header("Accept-Language"),
	});

	return {
		db: { client: config.db.client },
		config,
		queue: c.get("queue"),
		env: c.get("env"),
		kv: c.get("kv"),
		translate: createTranslator({ store: c.get("translationStore"), locale }),
		request: {
			url: c.req.url,
			ipAddress: connectionInfo.address ?? null,
			locale,
		},
	};
};

export default createServiceContext;
