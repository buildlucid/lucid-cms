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

const createUploadSessionController = factory.createHandlers(
	describeRoute({
		description:
			"Starts a private upload for a file attached to an agent chat. Continue it with the media upload session routes, then register it with the chat upload route.",
		tags: ["agent"],
		summary: "Create Agent Upload Session",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(
				controllerSchemas.createUploadSession.response,
			),
		}),
		requestBody: openAPI.requestBody(
			controllerSchemas.createUploadSession.body,
		),
		parameters: openAPI.parameters({ headers: { csrf: true } }),
	}),
	validateCSRF,
	authenticate(),
	agentAccess(),
	validate("json", controllerSchemas.createUploadSession.body),
	async (c) => {
		const context = createServiceContext(c);
		const body = c.req.valid("json");

		const session = await serviceWrapper(agentServices.createUploadSession, {
			transaction: false,
		})(context, {
			agentKey: body.agentKey,
			fileName: body.fileName,
			mimeType: body.mimeType,
			size: body.size,
			userId: c.get("auth").id,
		});
		if (session.error) throw new LucidAPIError(session.error);

		c.status(200);

		return c.json(formatAPIResponse(c, { data: session.data }));
	},
);

export default createUploadSessionController;
