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
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getUsageSessionController = factory.createHandlers(
	describeRoute({
		description: "Returns one AI usage session with its totals.",
		tags: ["ai"],
		summary: "Get AI Usage Session",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getUsageSession.response),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.getUsageSession.params,
		}),
	}),
	authenticate(),
	permissions([Permissions.SettingsRead]),
	validate("param", controllerSchemas.getUsageSession.params),
	async (c) => {
		const context = createServiceContext(c);
		const params = c.req.valid("param");

		const session = await serviceWrapper(aiServices.getUsageSession, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.ai.usage.fetch.error.name"),
				message: copy("server:core.routes.ai.usage.fetch.error.message"),
			},
		})(context, {
			type: params.type,
			id: params.id,
			viewerId: c.get("auth").id,
		});
		if (session.error) throw new LucidAPIError(session.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: session.data }));
	},
);

export default getUsageSessionController;
