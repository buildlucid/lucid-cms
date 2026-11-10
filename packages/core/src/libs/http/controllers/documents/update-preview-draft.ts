import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { previewSessionServices } from "../../../../services/index.js";
import { LucidError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import collectionPermissions from "../../middleware/collection-permissions.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const updatePreviewDraftController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Show unsaved editor content in a builder preview, or clear it so the preview shows the stored version.",
		tags: ["documents"],
		summary: "Update Preview Draft",
		responses: openAPI.responses({
			noProperties: true,
		}),
		requestBody: openAPI.requestBody(controllerSchemas.updatePreviewDraft.body),
		parameters: openAPI.parameters({
			params: controllerSchemas.updatePreviewDraft.params,
			headers: { csrf: true },
		}),
	})),
	validateCSRF(),
	authenticate(),
	validate("json", controllerSchemas.updatePreviewDraft.body),
	validate("param", controllerSchemas.updatePreviewDraft.params),
	//* proposals follow their request's edit access, and latest needs update access, so the service checks writes
	collectionPermissions("read"),
	async (c) => {
		const { collectionKey, id, versionId } = c.req.valid("param");
		const { token, revision, draft } = c.req.valid("json");
		const context = createServiceContext(c);

		const draftRes = await serviceWrapper(previewSessionServices.updateDraft, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.document.update.error.name"),
				message: copy("server:core.routes.document.update.error.message"),
			},
		})(context, {
			token,
			collectionKey,
			documentId: Number.parseInt(id, 10),
			versionId: Number.parseInt(versionId, 10),
			revision,
			draft,
			user: c.get("auth"),
		});
		if (draftRes.error) throw new LucidError(draftRes.error);

		c.header("Cache-Control", "private, no-store");
		c.status(204);
		return c.body(null);
	},
);

export default updatePreviewDraftController;
