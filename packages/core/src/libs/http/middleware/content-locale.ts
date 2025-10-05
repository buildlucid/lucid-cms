import serviceWrapper from "../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import constants from "../../../constants/constants.js";
import { createMiddleware } from "hono/factory";
import services from "../../../services/index.js";
import type { LucidHonoContext } from "../../../types/hono.js";

const contentLocale = createMiddleware(async (c: LucidHonoContext, next) => {
	const contentLocale = c.req.header(constants.headers.contentLocale);
	const config = c.get("config");

	const localeRes = await serviceWrapper(services.locales.getSingleFallback, {
		transaction: false,
	})(
		{
			db: config.db.client,
			config: config,
			queue: c.get("queue"),
			env: c.get("env"),
		},
		{
			code: Array.isArray(contentLocale) ? contentLocale[0] : contentLocale,
		},
	);
	if (localeRes.error) throw new LucidAPIError(localeRes.error);

	c.set("locale", localeRes.data);

	return await next();
});

export default contentLocale;
