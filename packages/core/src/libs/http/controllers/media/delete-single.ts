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

const deleteSingleController = factory.createHandlers(
	describeRoute({
		description: "Soft delete a single media item by its ID.",
		tags: ["media"],
		summary: "Delete Media",
		responses: openAPI.responses({
			noProperties: true,
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.deleteSingle.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate(),
	permissions([Permissions.MediaDelete]),
	validate("param", controllerSchemas.deleteSingle.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const context = createServiceContext(c);

		const deleteSingle = await serviceWrapper(mediaServices.deleteSingle, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.media.delete.error.name"),
				message: copy("server:core.routes.media.delete.error.message"),
			},
		})(context, {
			id: Number.parseInt(id, 10),
			userId: c.get("auth").id,
		});
		if (deleteSingle.error) throw new LucidAPIError(deleteSingle.error);

		c.status(204);
		return c.body(null);
	},
);

export default deleteSingleController;
