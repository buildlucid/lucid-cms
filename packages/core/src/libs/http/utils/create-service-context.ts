import type { LucidHonoContext } from "../../../types/hono.js";
import type { ServiceContext } from "../../../utils/services/types.js";

/**
 * A helper to build the service context from a Hono context.
 */
const createServiceContext = (c: LucidHonoContext): ServiceContext => {
	const connectionInfo = c.get("runtimeContext").getConnectionInfo(c);

	return {
		db: { client: c.get("config").db.client },
		config: c.get("config"),
		queue: c.get("queue"),
		env: c.get("env"),
		kv: c.get("kv"),
		request: {
			url: c.req.url,
			ipAddress: connectionInfo.address ?? null,
		},
	};
};

export default createServiceContext;
