import type { LucidHonoContext, ServiceContext } from "@lucidcms/core/types";

/**
 * Mirrors core's HTTP service-context builder inside the plugin so these
 * plugin-owned routes can call services without depending on private core files.
 */
const getServiceContext = (c: LucidHonoContext): ServiceContext => {
	return {
		db: {
			client: c.get("config").db.client,
		},
		config: c.get("config"),
		queue: c.get("queue"),
		env: c.get("env"),
		kv: c.get("kv"),
		requestUrl: c.req.url,
	};
};

export default getServiceContext;
