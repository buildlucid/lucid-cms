import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/agent.js";
import { agentServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import agentAccess from "../../middleware/agent-access.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getMediaPreviewsController = factory.createHandlers(
	describeRoute({
		description:
			"Returns current details for images, videos and audio linked to this chat that the current viewer can read, for preview galleries.",
		tags: ["agent"],
		summary: "Get Agent Media Previews",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getMediaPreviews.response),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.getMediaPreviews.params,
		}),
	}),
	authenticate(),
	agentAccess(),
	validate("param", controllerSchemas.getMediaPreviews.params),
	async (c) => {
		const context = createServiceContext(c);
		const param = c.req.valid("param");

		const details = await serviceWrapper(agentServices.getMediaPreviews, {
			transaction: false,
		})(context, {
			id: param.id,
			userId: c.get("auth").id,
		});
		if (details.error) throw new LucidAPIError(details.error);

		c.status(200);

		return c.json(formatAPIResponse(c, { data: details.data }));
	},
);

export default getMediaPreviewsController;
