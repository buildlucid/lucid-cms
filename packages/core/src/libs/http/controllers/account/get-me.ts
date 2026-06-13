import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/account.js";
import { accountServices } from "../../../../services/index.js";
import type { LucidHonoContext } from "../../../../types/hono.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import { honoOpenAPIResponse } from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getMeController = factory.createHandlers(
	describeRoute({
		description: "Returns the authenticated user based on the access token.",
		tags: ["account"],
		summary: "Get Authenticated User",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getMe.response),
		}),
	}),
	authenticate({ tenantScope: "allow-global" }),
	async (c: LucidHonoContext) => {
		const context = createServiceContext(c);

		const user = await serviceWrapper(accountServices.getAuthenticatedUser, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.user.fetch.error.name"),
				message: copy("server:core.routes.user.fetch.error.message"),
			},
		})(context, {
			userId: c.get("auth").id,
			authUser: c.get("auth"),
		});
		if (user.error) throw new LucidAPIError(user.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: user.data,
			}),
		);
	},
);

export default getMeController;
