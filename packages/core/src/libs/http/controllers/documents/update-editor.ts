import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { documentEditorServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import collectionPermissions from "../../middleware/collection-permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const updateEditorController = factory.createHandlers(
	describeRoute({
		description:
			"Records that a browser tab has a document version open in the editor, and returns who holds it. Only people who can save the version can hold it. The admin sends it every 30 seconds while the editor is open.",
		tags: ["documents"],
		summary: "Update Document Editor",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.updateEditor.response),
		}),
		requestBody: openAPI.requestBody(controllerSchemas.updateEditor.body),
		parameters: openAPI.parameters({
			params: controllerSchemas.updateEditor.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate(),
	validate("json", controllerSchemas.updateEditor.body),
	validate("param", controllerSchemas.updateEditor.params),
	collectionPermissions("read"),
	async (c) => {
		const { requestId, takeOver } = c.req.valid("json");
		const { collectionKey, id, tabId } = c.req.valid("param");
		const context = createServiceContext(c);

		const editors = await serviceWrapper(documentEditorServices.heartbeat, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.document.editors.error.name"),
				message: copy("server:core.routes.document.editors.error.message"),
			},
		})(context, {
			collectionKey,
			documentId: Number.parseInt(id, 10),
			requestId,
			tabId,
			user: c.get("auth"),
			takeOver,
		});
		if (editors.error) throw new LucidAPIError(editors.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: editors.data }));
	},
);

export default updateEditorController;
