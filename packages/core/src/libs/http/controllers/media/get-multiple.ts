import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/media.js";
import { mediaServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import buildFormattedQuery from "../../utils/build-formatted-query.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getMultipleController = factory.createHandlers(
	describeRoute({
		description: "Get a multiple media items.",
		tags: ["media"],
		summary: "Get Multiple Media",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.getMultiple.response),
			paginated: true,
		}),
		parameters: openAPI.parameters({
			query: controllerSchemas.getMultiple.query.string,
		}),
	}),
	authenticate(),
	validate("query", controllerSchemas.getMultiple.query.string),
	async (c) => {
		const context = createServiceContext(c);
		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.getMultiple.query.formatted,
			{
				nullableFields: ["folderId"],
			},
		);

		const media = await serviceWrapper(mediaServices.getMultiple, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.media.fetch.error.name"),
				message: copy("server:core.routes.media.fetch.error.message"),
			},
		})(context, {
			query: formattedQuery,
		});
		if (media.error) throw new LucidAPIError(media.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: media.data.data,
				pagination: {
					count: media.data.count,
					page: formattedQuery.page,
					perPage: formattedQuery.perPage,
				},
			}),
		);
	},
);

export default getMultipleController;
