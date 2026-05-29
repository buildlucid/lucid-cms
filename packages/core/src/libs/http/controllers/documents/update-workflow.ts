import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { documentWorkflowServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { text } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import collectionPermissions from "../../middleware/collection-permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const updateWorkflowController = factory.createHandlers(
	describeRoute({
		description: "Update a document workflow stage or assignees.",
		tags: ["documents"],
		summary: "Update Document Workflow",
		responses: honoOpenAPIResponse({
			noProperties: true,
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.updateWorkflow.body),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.updateWorkflow.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate,
	validate("json", controllerSchemas.updateWorkflow.body),
	validate("param", controllerSchemas.updateWorkflow.params),
	collectionPermissions("update"),
	async (c) => {
		const { collectionKey, id } = c.req.valid("param");
		const { stage, assigneeIds } = c.req.valid("json");
		const context = createServiceContext(c);

		const workflow = await serviceWrapper(
			documentWorkflowServices.updateSingle,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: text.server("core.routes.document.workflow.update.error.name"),
					message: text.server(
						"core.routes.document.workflow.update.error.message",
					),
				},
			},
		)(context, {
			collectionKey,
			documentId: Number.parseInt(id, 10),
			stage,
			assigneeIds,
			user: c.get("auth"),
		});
		if (workflow.error) throw new LucidAPIError(workflow.error);

		c.status(204);
		return c.body(null);
	},
);

export default updateWorkflowController;
