import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/notifications.js";
import { notificationServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getTypesController = factory.createHandlers(
	describeRoute({
		description: "Every notification type with its current settings.",
		tags: ["notifications"],
		summary: "Get Notification Types",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getTypes.response),
		}),
	}),
	authenticate(),
	permissions([Permissions.SettingsRead]),
	async (c) => {
		const context = createServiceContext(c);

		const result = await serviceWrapper(notificationServices.getTypes, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.notifications.error.name"),
				message: copy("server:core.routes.notifications.error.message"),
			},
		})(context);
		if (result.error) throw new LucidAPIError(result.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: result.data }));
	},
);

export default getTypesController;
