import { hoursToSeconds } from "date-fns";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../../schemas/locales.js";
import { localeServices } from "../../../../../services/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import cacheKeys from "../../../../kv/cache-keys.js";
import { ExternalScopes } from "../../../../permission/external-scopes.js";
import cache from "../../../middleware/cache.js";
import externalAuthentication from "../../../middleware/external-authenticate.js";
import externalScopes from "../../../middleware/external-scopes.js";
import openAPI from "../../../openapi/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const getAllController = factory.createHandlers(
	describeRoute({
		description: "Returns all enabled locales via an external credential.",
		tags: ["content-locales"],
		summary: "Get All Locales",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.content.getAll.response),
			paginated: true,
		}),
		parameters: openAPI.parameters({
			headers: {
				authorization: true,
			},
		}),
	}),
	externalAuthentication,
	externalScopes([ExternalScopes.LocalesRead]),
	cache({
		ttl: hoursToSeconds(24),
		mode: "static",
		staticKey: cacheKeys.http.static.contentLocales,
	}),
	async (c) => {
		const context = createServiceContext(c);

		const locales = await serviceWrapper(localeServices.content.getAll, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.locale.fetch.error.name"),
				message: copy("server:core.routes.locale.fetch.error.message"),
			},
		})(context);
		if (locales.error) throw new LucidAPIError(locales.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: locales.data,
			}),
		);
	},
);

export default getAllController;
