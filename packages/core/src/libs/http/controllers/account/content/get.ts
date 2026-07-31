import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../../schemas/account.js";
import { accountServices } from "../../../../../services/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import { ExternalScopes } from "../../../../permission/external-scopes.js";
import externalAuthentication from "../../../middleware/external-authenticate.js";
import externalScopes from "../../../middleware/external-scopes.js";
import openAPI from "../../../openapi/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const getController = factory.createHandlers(
	describeRoute({
		description:
			"Returns the account associated with an external user credential.",
		tags: ["content-account"],
		summary: "Get Account",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.content.get.response),
		}),
		parameters: openAPI.parameters({
			headers: {
				authorization: true,
			},
		}),
	}),
	externalAuthentication({ principalType: "user" }),
	externalScopes([ExternalScopes.AccountRead]),
	async (c) => {
		const context = createServiceContext(c);
		const accountRes = await serviceWrapper(accountServices.content.get, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.user.fetch.error.name"),
				message: copy("server:core.routes.user.fetch.error.message"),
			},
		})(context, {
			userId: c.get("externalUserId"),
		});
		if (accountRes.error) throw new LucidAPIError(accountRes.error);

		c.header("Cache-Control", "private, no-store");
		c.header("Pragma", "no-cache");
		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: accountRes.data,
			}),
		);
	},
);

export default getController;
