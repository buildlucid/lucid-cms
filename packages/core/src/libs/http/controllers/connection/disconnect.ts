import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { connectionServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const disconnectController = factory.createHandlers(
	describeRoute({
		description:
			"Revokes the refresh token before clearing the local OAuth grant.",
		tags: ["connection"],
		summary: "Disconnect from Lucid",
		responses: openAPI.responses({ noProperties: true }),
		parameters: openAPI.parameters({
			headers: { csrf: true },
		}),
	}),
	validateCSRF,
	authenticate(),
	permissions([Permissions.ConnectionUpdate]),
	async (c) => {
		const context = createServiceContext(c);
		const result = await serviceWrapper(connectionServices.disconnect, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.connection.error.name"),
				message: copy("server:core.connection.retryable"),
			},
		})(context);
		if (result.error) throw new LucidAPIError(result.error);

		c.header("Cache-Control", "private, no-store");
		c.header("Pragma", "no-cache");
		c.status(204);
		return c.body(null);
	},
);

export default disconnectController;
