import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/connection.js";
import { connectionServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const statusController = factory.createHandlers(
	describeRoute({
		description: "Returns the Lucid connection and revalidates stale state.",
		tags: ["connection"],
		summary: "Get Lucid Connection",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.status.response),
		}),
	}),
	authenticate(),
	async (c) => {
		const context = createServiceContext(c);
		const result = await serviceWrapper(connectionServices.status, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.connection.error.name"),
				message: copy("server:core.connection.failed"),
			},
		})(context);
		if (result.error) throw new LucidAPIError(result.error);

		c.header("Cache-Control", "private, no-store");
		c.header("Pragma", "no-cache");
		c.status(200);
		return c.json(formatAPIResponse(c, { data: result.data }));
	},
);

export default statusController;
