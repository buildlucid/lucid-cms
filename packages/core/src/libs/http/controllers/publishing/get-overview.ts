import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/publishing.js";
import { publishingServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getOverviewController = factory.createHandlers(
	describeRoute({
		description: "Get publishing status counts across readable collections.",
		tags: ["publishing"],
		summary: "Get Publishing Overview",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.getOverview.response),
		}),
	}),
	authenticate(),
	permissions([Permissions.PublishOperationsRead]),
	async (c) => {
		const context = createServiceContext(c);
		const overview = await serviceWrapper(publishingServices.getOverview, {
			transaction: false,
		})(context, {
			user: c.get("auth"),
		});
		if (overview.error) throw new LucidAPIError(overview.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: overview.data }));
	},
);

export default getOverviewController;
