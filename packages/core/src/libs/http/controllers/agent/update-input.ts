import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/agent.js";
import { agentServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import agentAccess from "../../middleware/agent-access.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const updateInputController = factory.createHandlers(
	describeRoute({
		description:
			"Edits, cancels or steers pending input, or resumes the queue.",
		tags: ["agent"],
		summary: "Update Agent Input",
		requestBody: openAPI.requestBody(controllerSchemas.updateInput.body),
		parameters: openAPI.parameters({
			params: controllerSchemas.updateInput.params,
			headers: { csrf: true },
		}),
	}),
	validateCSRF,
	authenticate(),
	agentAccess(),
	validate("param", controllerSchemas.updateInput.params),
	validate("json", controllerSchemas.updateInput.body),
	async (c) => {
		const context = createServiceContext(c);
		const body = c.req.valid("json");
		const param = c.req.valid("param");

		const result = await serviceWrapper(agentServices.updateInput, {
			transaction: false,
		})(context, {
			conversationId: param.id,
			userId: c.get("auth").id,
			action: body,
		});
		if (result.error) throw new LucidAPIError(result.error);

		return c.body(null, 204);
	},
);
export default updateInputController;
