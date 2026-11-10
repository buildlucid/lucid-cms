import { createFactory } from "hono/factory";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/diagnostics.js";
import { diagnosticServices } from "../../../../services/index.js";
import { LucidError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getDiagnosticsController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Returns install, runtime and configuration details for troubleshooting. Never includes secrets or personal data.",
		tags: ["diagnostics"],
		summary: "Get Diagnostics",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getDiagnostics.response),
		}),
	})),
	authenticate(),
	permissions([Permissions.SettingsRead]),
	async (c) => {
		const context = createServiceContext(c);

		const diagnostics = await serviceWrapper(
			diagnosticServices.getDiagnostics,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.diagnostics.fetch.error.name"),
					message: copy("server:core.routes.diagnostics.fetch.error.message"),
				},
			},
		)(context);
		if (diagnostics.error) throw new LucidError(diagnostics.error);

		c.header("Cache-Control", "private, no-store");
		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: diagnostics.data,
			}),
		);
	},
);

export default getDiagnosticsController;
