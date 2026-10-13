import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
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
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const deleteEditorController = factory.createHandlers(
	describeRoute({
		description:
			"Records that a browser tab closed a document in the editor, letting go of any hold it had.",
		tags: ["documents"],
		summary: "Delete Document Editor",
		responses: openAPI.responses({
			noProperties: true,
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.deleteEditor.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF(),
	authenticate(),
	validate("param", controllerSchemas.deleteEditor.params),
	collectionPermissions("read"),
	async (c) => {
		const { collectionKey, id, tabId } = c.req.valid("param");
		const context = createServiceContext(c);

		const left = await serviceWrapper(documentEditorServices.leave, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.document.editors.error.name"),
				message: copy("server:core.routes.document.editors.error.message"),
			},
		})(context, {
			collectionKey,
			documentId: Number.parseInt(id, 10),
			tabId,
			userId: c.get("auth").id,
		});
		if (left.error) throw new LucidAPIError(left.error);

		c.status(204);
		return c.body(null);
	},
);

export default deleteEditorController;
