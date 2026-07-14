import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/documents.js";
import { documentPreviewServices } from "../../../../services/index.js";
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

const createPreviewController = factory.createHandlers(
	describeRoute({
		description:
			"Create an expiring preview URL for a persisted document version.",
		tags: ["documents"],
		summary: "Create Document Preview URL",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.createPreview.response),
		}),
		requestBody: openAPI.requestBody(controllerSchemas.createPreview.body),
		parameters: openAPI.parameters({
			params: controllerSchemas.createPreview.params,
			headers: { csrf: true },
		}),
	}),
	validateCSRF,
	authenticate(),
	validate("json", controllerSchemas.createPreview.body),
	validate("param", controllerSchemas.createPreview.params),
	collectionPermissions("read"),
	async (c) => {
		const { collectionKey, id } = c.req.valid("param");
		const { locale, versionType, versionId } = c.req.valid("json");
		const context = createServiceContext(c);

		const previewRes = await serviceWrapper(documentPreviewServices.create, {
			transaction: true,
			logError: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.document.fetch.error.name"),
				message: copy("server:core.routes.document.fetch.error.message"),
			},
		})(context, {
			collectionKey,
			documentId: Number.parseInt(id, 10),
			versionType,
			versionId,
			locale,
			userId: c.get("auth").id,
		});
		if (previewRes.error) throw new LucidAPIError(previewRes.error);

		c.header("Cache-Control", "private, no-store");
		c.header("Pragma", "no-cache");

		c.status(200);
		return c.json(formatAPIResponse(c, { data: previewRes.data }));
	},
);

export default createPreviewController;
