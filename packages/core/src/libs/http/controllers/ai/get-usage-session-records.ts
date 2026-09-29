import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/ai.js";
import { aiServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import buildFormattedQuery from "../../utils/build-formatted-query.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getUsageSessionRecordsController = factory.createHandlers(
	describeRoute({
		description: "Returns a page of the requests in one AI usage session.",
		tags: ["ai"],
		summary: "Get AI Usage Session Records",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(
				controllerSchemas.getUsageSessionRecords.response,
			),
			paginated: true,
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.getUsageSessionRecords.params,
			query: controllerSchemas.getUsageSessionRecords.query.string,
		}),
	}),
	authenticate(),
	permissions([Permissions.SettingsRead]),
	validate("param", controllerSchemas.getUsageSessionRecords.params),
	validate("query", controllerSchemas.getUsageSessionRecords.query.string),
	async (c) => {
		const context = createServiceContext(c);
		const params = c.req.valid("param");
		const query = await buildFormattedQuery(
			c,
			controllerSchemas.getUsageSessionRecords.query.formatted,
		);

		const records = await serviceWrapper(aiServices.getUsageSessionRecords, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.ai.usage.fetch.error.name"),
				message: copy("server:core.routes.ai.usage.fetch.error.message"),
			},
		})(context, {
			type: params.type,
			id: params.id,
			query,
		});
		if (records.error) throw new LucidAPIError(records.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: records.data.data,
				pagination: {
					count: records.data.count,
					page: query.page,
					perPage: query.perPage,
				},
			}),
		);
	},
);

export default getUsageSessionRecordsController;
