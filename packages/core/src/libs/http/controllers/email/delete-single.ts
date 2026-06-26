import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/email.js";
import { emailServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const deleteSingleController = factory.createHandlers(
	describeRoute({
		description: "Deletes a single email based on the the id.",
		tags: ["emails"],
		summary: "Delete Email",
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
	authenticate(),
	permissions([Permissions.EmailDelete]),
	validate("param", controllerSchemas.deleteSingle.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const context = createServiceContext(c);

		const deleteSingle = await serviceWrapper(emailServices.deleteSingle, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.email.delete.error.name"),
				message: copy("server:core.routes.email.delete.error.message"),
			},
		})(context, {
			id: Number.parseInt(id, 10),
		});
		if (deleteSingle.error) throw new LucidAPIError(deleteSingle.error);

		c.status(204);
		return c.body(null);
	},
);

export default deleteSingleController;
