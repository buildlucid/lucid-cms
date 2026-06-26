import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { documentWorkflowServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import collectionPermissions from "../../middleware/collection-permissions.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getWorkflowAssigneesController = factory.createHandlers(
	describeRoute({
		description: "Get users who can be assigned to a document workflow.",
		tags: ["documents"],
		summary: "Get Document Workflow Assignees",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.getWorkflowAssignees.response),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.getWorkflowAssignees.params,
		}),
	}),
	authenticate(),
	validate("param", controllerSchemas.getWorkflowAssignees.params),
	collectionPermissions("read"),
	async (c) => {
		const { collectionKey } = c.req.valid("param");
		const context = createServiceContext(c);

		const users = await serviceWrapper(documentWorkflowServices.getAssignees, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.document.workflow.assignees.error.name"),
				message: copy(
					"server:core.routes.document.workflow.assignees.error.message",
				),
			},
		})(context, {
			collectionKey,
		});
		if (users.error) throw new LucidAPIError(users.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: users.data,
			}),
		);
	},
);

export default getWorkflowAssigneesController;
