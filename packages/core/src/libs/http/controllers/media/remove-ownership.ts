import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/media.js";
import { mediaServices } from "../../../../services/index.js";
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

const removeOwnershipController = factory.createHandlers(
	describeRoute({
		description:
			"Removes your ownership of personal media, such as an agent chat upload, so it joins the shared media library.",
		tags: ["media"],
		summary: "Remove Media Ownership",
		responses: openAPI.responses({
			noProperties: true,
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.removeOwnership.params,
			headers: {
				csrf: true,
			},
		}),
		requestBody: openAPI.requestBody(controllerSchemas.removeOwnership.body),
	}),
	validateCSRF,
	authenticate(),
	permissions([Permissions.MediaCreate]),
	validate("param", controllerSchemas.removeOwnership.params),
	validate("json", controllerSchemas.removeOwnership.body),
	async (c) => {
		const { id } = c.req.valid("param");
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const moved = await serviceWrapper(mediaServices.removeOwnership, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.media.update.error.name"),
				message: copy("server:core.routes.media.update.error.message"),
			},
		})(context, {
			id: Number.parseInt(id, 10),
			public: body.public,
			folderId: body.folderId,
			userId: c.get("auth").id,
		});
		if (moved.error) throw new LucidAPIError(moved.error);

		c.status(204);
		return c.body(null);
	},
);

export default removeOwnershipController;
