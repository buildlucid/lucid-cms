import { describeRoute } from "hono-openapi";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/agent-memories.js";
import { agentServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import agentAccess from "../../middleware/agent-access.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const deleteMemoriesController = factory.createHandlers(
	describeRoute({
		description:
			"Deletes agent memories. Shared memories need the manage shared memories permission.",
		tags: ["agent"],
		summary: "Delete Agent Memories",
		responses: openAPI.responses({ noProperties: true }),
		requestBody: openAPI.requestBody(controllerSchemas.deleteMemories.body),
		parameters: openAPI.parameters({ headers: { csrf: true } }),
	}),
	validateCSRF(),
	authenticate(),
	agentAccess(),
	validate("json", controllerSchemas.deleteMemories.body),
	async (c) => {
		const context = createServiceContext(c);
		const body = c.req.valid("json");

		const deleted = await serviceWrapper(agentServices.deleteMemories, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.agent.error.name"),
				message: copy("server:core.routes.agent.error.message"),
			},
		})(context, { userId: c.get("auth").id, ids: body.ids });
		if (deleted.error) throw new LucidAPIError(deleted.error);

		c.status(204);

		return c.body(null);
	},
);

export default deleteMemoriesController;
