import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/review.js";
import { reviewServices } from "../../../../services/index.js";
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
		description:
			"Get open request counts, and how each readable collection's documents in every publish target compare to latest.",
		tags: ["review"],
		summary: "Get Review Overview",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getOverview.response),
		}),
	}),
	authenticate(),
	permissions([Permissions.RequestsRead]),
	async (c) => {
		const context = createServiceContext(c);
		const overview = await serviceWrapper(reviewServices.getOverview, {
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
