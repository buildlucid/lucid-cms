import serviceWrapper from "../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import constants from "../../../constants/constants.js";
import type { FastifyRequest } from "fastify";

const contentLocale = async (request: FastifyRequest) => {
	const contentLocale = request.headers[constants.headers.contentLocale];

	const localeRes = await serviceWrapper(
		request.server.services.locale.getSingleFallback,
		{
			transaction: false,
		},
	)(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			code: Array.isArray(contentLocale) ? contentLocale[0] : contentLocale,
		},
	);
	if (localeRes.error) throw new LucidAPIError(localeRes.error);

	request.locale = localeRes.data;

	return;
};

export default contentLocale;
