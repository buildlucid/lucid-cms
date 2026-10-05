import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/releases.js";
import { releaseServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const removeDocumentController = factory.createHandlers(
	describeRoute({
		description:
			"Remove a document from a release. This dismisses any approval.",
		tags: ["releases"],
		summary: "Remove Release Document",
		responses: openAPI.responses({
			noProperties: true,
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.removeDocument.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate(),
	permissions([Permissions.ReleasesRead]),
	validate("param", controllerSchemas.removeDocument.params),
	async (c) => {
		const { id, releaseDocumentId } = c.req.valid("param");
		const context = createServiceContext(c);

		const result = await serviceWrapper(releaseServices.removeDocument, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.releases.error.name"),
				message: copy("server:core.routes.releases.error.message"),
			},
		})(context, {
			id: Number.parseInt(id, 10),
			releaseDocumentId: Number.parseInt(releaseDocumentId, 10),
			user: c.get("auth"),
		});
		if (result.error) throw new LucidAPIError(result.error);

		c.status(204);
		return c.body(null);
	},
);

export default removeDocumentController;
