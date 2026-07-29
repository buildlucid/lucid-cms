import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/connection.js";
import { connectionServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const verifyController = factory.createHandlers(
	describeRoute({
		description:
			"Refreshes credentials if needed and verifies the Lucid connection.",
		tags: ["connection"],
		summary: "Verify Lucid Connection",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.verify.response),
		}),
		parameters: openAPI.parameters({
			headers: { csrf: true },
		}),
	}),
	validateCSRF,
	authenticate(),
	permissions([Permissions.ConnectionUpdate]),
	async (c) => {
		const context = createServiceContext(c);
		const result = await serviceWrapper(connectionServices.verify, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.connection.error.name"),
				message: copy("server:core.connection.failed"),
			},
		})(context, {});
		if (result.error) throw new LucidAPIError(result.error);

		c.header("Cache-Control", "private, no-store");
		c.header("Pragma", "no-cache");
		c.status(200);
		return c.json(formatAPIResponse(c, { data: result.data }));
	},
);

export default verifyController;
