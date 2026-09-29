import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/ai.js";
import { aiServices } from "../../../../services/index.js";
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

const getCreditsController = factory.createHandlers(
	describeRoute({
		description:
			"Returns the credits this CMS can spend through its Lucid connection, and when they reset.",
		tags: ["ai"],
		summary: "Get AI Credits",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getCredits.response),
		}),
	}),
	authenticate(),
	permissions([Permissions.SettingsRead]),
	async (c) => {
		const context = createServiceContext(c);

		const credits = await serviceWrapper(aiServices.getCredits, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.ai.credits.fetch.error.name"),
				message: copy("server:core.routes.ai.credits.fetch.error.message"),
			},
		})(context);
		if (credits.error) throw new LucidAPIError(credits.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: credits.data }));
	},
);

export default getCreditsController;
