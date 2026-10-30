import { describeRoute } from "hono-openapi";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/documents.js";
import publish from "../../../../services/documents/publish.js";
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

const promoteVersionController = factory.createHandlers(
	describeRoute({
		description: "Promote a document version to a new version type.",
		tags: ["documents"],
		summary: "Promote Document Version",
		responses: openAPI.responses({
			noProperties: true,
		}),
		requestBody: openAPI.requestBody(controllerSchemas.promoteVersion.body),
		parameters: openAPI.parameters({
			params: controllerSchemas.promoteVersion.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF(),
	authenticate(),
	validate("json", controllerSchemas.promoteVersion.body),
	validate("param", controllerSchemas.promoteVersion.params),
	collectionPermissions("publish"),
	async (c) => {
		const { versionType } = c.req.valid("json");
		const { collectionKey, id, versionId } = c.req.valid("param");
		const context = createServiceContext(c);

		const publishRes = await serviceWrapper(publish, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.document.promote.version.error.name"),
				message: copy(
					"server:core.routes.document.promote.version.error.message",
				),
			},
		})(context, {
			sourceVersionId: Number.parseInt(versionId, 10),
			user: c.get("auth"),
			documentId: Number.parseInt(id, 10),
			collectionKey,
			environment: versionType,
		});
		if (publishRes.error) {
			throw new LucidAPIError(publishRes.error);
		}

		c.status(204);
		return c.body(null);
	},
);

export default promoteVersionController;
