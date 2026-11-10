import { createFactory } from "hono/factory";
import z from "zod";
import { controllerSchemas } from "../../../../../schemas/redirects.js";
import { redirectServices } from "../../../../../services/index.js";
import { LucidError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import { ExternalScopes } from "../../../../permission/external-scopes.js";
import externalAuthentication from "../../../middleware/external-authenticate.js";
import externalScopes from "../../../middleware/external-scopes.js";
import validate from "../../../middleware/validate.js";
import openAPI from "../../../openapi/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const resolveController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Returns where a website path redirects to, or null. Call it when no page matches the path.",
		tags: ["content-redirects"],
		summary: "Resolve Redirect",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.content.resolve.response),
		}),
		parameters: openAPI.parameters({
			query: controllerSchemas.content.resolve.query.string,
			headers: {
				authorization: true,
			},
		}),
	})),
	externalAuthentication(),
	externalScopes([ExternalScopes.RedirectsRead]),
	validate("query", controllerSchemas.content.resolve.query.string),
	async (c) => {
		const query = c.req.valid("query");
		const context = createServiceContext(c);

		const redirect = await serviceWrapper(redirectServices.resolve, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.redirect.resolve.error.name"),
				message: copy("server:core.routes.redirect.resolve.error.message"),
			},
		})(context, query);
		if (redirect.error) throw new LucidError(redirect.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: redirect.data,
			}),
		);
	},
);

export default resolveController;
