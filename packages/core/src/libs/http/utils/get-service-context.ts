import type { LucidHonoContext } from "../../../types/hono.js";
import type { ServiceContext } from "../../../utils/services/types.js";

/**
 * A helper to build the service context from a Hono context.
 */
const getServiceContext = (c: LucidHonoContext): ServiceContext => {
	return {
		db: { client: c.get("config").db.client },
		config: c.get("config"),
		queue: c.get("queue"),
		env: c.get("env"),
		kv: c.get("kv"),
		requestUrl: c.req.url,
	};
};

export default getServiceContext;
