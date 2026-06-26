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
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getUsageChartController = factory.createHandlers(
	describeRoute({
		description: "Returns aggregated AI usage chart data.",
		tags: ["ai"],
		summary: "Get AI Usage Chart",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.getUsageChart.response),
		}),
		parameters: openAPI.parameters({
			query: controllerSchemas.getUsageChart.query.string,
		}),
	}),
	authenticate(),
	permissions([Permissions.SettingsRead]),
	validate("query", controllerSchemas.getUsageChart.query.string),
	async (c) => {
		const context = createServiceContext(c);
		const query = c.req.valid("query");

		const aiUsageChart = await serviceWrapper(aiServices.getUsageChart, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.ai.usage.chart.fetch.error.name"),
				message: copy("server:core.routes.ai.usage.chart.fetch.error.message"),
			},
		})(context, {
			query,
		});
		if (aiUsageChart.error) throw new LucidAPIError(aiUsageChart.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: aiUsageChart.data,
			}),
		);
	},
);

export default getUsageChartController;
