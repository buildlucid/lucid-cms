import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { previewSessionServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import collectionPermissions from "../../middleware/collection-permissions.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const revokePreviewsController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Ends every preview of a document, so its preview links stop working. Builder previews start a new one.",
		tags: ["documents"],
		summary: "Revoke Document Previews",
		responses: openAPI.responses({
			noProperties: true,
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.revokePreviews.params,
			headers: { csrf: true },
		}),
	})),
	validateCSRF(),
	authenticate(),
	validate("param", controllerSchemas.revokePreviews.params),
	collectionPermissions("update"),
	async (c) => {
		const { collectionKey, id } = c.req.valid("param");
		const context = createServiceContext(c);

		const revoked = await serviceWrapper(
			previewSessionServices.deleteForDocuments,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.document.previews.revoke.error.name"),
					message: copy(
						"server:core.routes.document.previews.revoke.error.message",
					),
				},
			},
		)(context, {
			collectionKey,
			documentIds: [Number.parseInt(id, 10)],
		});
		if (revoked.error) throw new LucidAPIError(revoked.error);

		c.status(204);
		return c.body(null);
	},
);

export default revokePreviewsController;
