import { createFactory } from "hono/factory";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/translations.js";
import { translationServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getSettingsController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Get the glossary and style notes that every translation follows.",
		tags: ["translations"],
		summary: "Get Translation Settings",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getSettings.response),
		}),
	})),
	authenticate(),
	permissions([Permissions.SettingsRead]),
	async (c) => {
		const context = createServiceContext(c);

		const result = await serviceWrapper(translationServices.getSettings, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.translations.error.name"),
				message: copy("server:core.routes.translations.error.message"),
			},
		})(context);
		if (result.error) throw new LucidAPIError(result.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: result.data }));
	},
);

export default getSettingsController;
