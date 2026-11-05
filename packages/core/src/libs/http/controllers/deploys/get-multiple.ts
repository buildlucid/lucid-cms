import { createFactory } from "hono/factory";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/deploys.js";
import { deployServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getMultipleController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Returns the configured deploys with their on/off state, waiting triggers and current runs.",
		tags: ["deploys"],
		summary: "Get Deploys",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getMultiple.response),
		}),
	})),
	authenticate(),
	async (c) => {
		const context = createServiceContext(c);

		const deploys = await serviceWrapper(deployServices.getMultiple, {
			transaction: false,
			defaultError: {
				type: "basic",
				message: copy("server:core.deploys.fetch.failed"),
			},
		})(context, { actor: c.get("auth") });
		if (deploys.error) throw new LucidAPIError(deploys.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: deploys.data }));
	},
);

export default getMultipleController;
