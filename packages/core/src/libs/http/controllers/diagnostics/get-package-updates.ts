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

const getPackageUpdatesController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Compares core, the runtime, the database adapter and plugins that declare their package with their latest versions on npm. Returns an empty list when update checks are off.",
		tags: ["diagnostics"],
		summary: "Get Package Updates",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getPackageUpdates.response),
		}),
	})),
	authenticate(),
	permissions([Permissions.SettingsRead]),
	async (c) => {
		const context = createServiceContext(c);

		const updates = await serviceWrapper(diagnosticServices.getPackageUpdates, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.diagnostics.updates.error.name"),
				message: copy("server:core.routes.diagnostics.updates.error.message"),
			},
		})(context);
		if (updates.error) throw new LucidError(updates.error);

		c.header("Cache-Control", "private, no-store");
		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: updates.data,
			}),
		);
	},
);

export default getPackageUpdatesController;
