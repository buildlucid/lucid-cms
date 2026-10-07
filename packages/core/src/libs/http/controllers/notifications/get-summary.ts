import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/notifications.js";
import { notificationServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getSummaryController = factory.createHandlers(
	describeRoute({
		description:
			"Unread and to-do counts for your inbox. Poll this instead of the list.",
		tags: ["notifications"],
		summary: "Get Notification Summary",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getSummary.response),
		}),
	}),
	authenticate(),
	async (c) => {
		const context = createServiceContext(c);

		const result = await serviceWrapper(notificationServices.getSummary, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.notifications.error.name"),
				message: copy("server:core.routes.notifications.error.message"),
			},
		})(context, {
			userId: c.get("auth").id,
		});
		if (result.error) throw new LucidAPIError(result.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: result.data }));
	},
);

export default getSummaryController;
