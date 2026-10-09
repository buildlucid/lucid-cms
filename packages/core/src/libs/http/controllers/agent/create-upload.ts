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
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const createUploadController = factory.createHandlers(
	describeRoute({
		description:
			"Registers an uploaded chat attachment as your personal media. It stays private and out of the media library until you move it there.",
		tags: ["agent"],
		summary: "Create Agent Upload",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.createUpload.response),
		}),
		requestBody: openAPI.requestBody(controllerSchemas.createUpload.body),
		parameters: openAPI.parameters({ headers: { csrf: true } }),
	}),
	validateCSRF,
	authenticate(),
	agentAccess(),
	validate("json", controllerSchemas.createUpload.body),
	async (c) => {
		const context = createServiceContext(c);
		const body = c.req.valid("json");

		const media = await serviceWrapper(agentServices.createUpload, {
			transaction: true,
		})(context, {
			agentKey: body.agentKey,
			key: body.key,
			fileName: body.fileName,
			width: body.width,
			height: body.height,
			posterId: body.posterId,
			user: c.get("auth"),
		});
		if (media.error) throw new LucidAPIError(media.error);

		c.status(201);

		return c.json(formatAPIResponse(c, { data: media.data }));
	},
);

export default createUploadController;
