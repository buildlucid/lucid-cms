import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/jobs.js";
import { jobServices } from "../../../../services/index.js";
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

const getSchedulesController = factory.createHandlers(
	describeRoute({
		description: "Returns the schedules registered on active job definitions.",
		tags: ["jobs"],
		summary: "Get Job Schedules",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getSchedules.response),
			paginated: true,
		}),
		parameters: openAPI.parameters({
			query: controllerSchemas.getSchedules.query.string,
		}),
	}),
	authenticate(),
	permissions([Permissions.JobsRead]),
	validate("query", controllerSchemas.getSchedules.query.string),
	async (c) => {
		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.getSchedules.query.formatted,
			{ nullableFields: ["pausedAt"] },
		);
		const context = createServiceContext(c);

		const schedules = await serviceWrapper(jobServices.getSchedules, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.job.fetch.error.name"),
				message: copy("server:core.routes.job.fetch.error.message"),
			},
		})(context, { query: formattedQuery });
		if (schedules.error) throw new LucidAPIError(schedules.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: schedules.data.data,
				pagination: {
					count: schedules.data.count,
					page: formattedQuery.page,
					perPage: formattedQuery.perPage,
				},
			}),
		);
	},
);

export default getSchedulesController;
