import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/account.js";
import { accountServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import type { LucidHonoContext } from "../../../../types/hono.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import { honoOpenAPIResponse } from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import authenticate from "../../middleware/authenticate.js";
import formatAPIResponse from "../../utils/build-response.js";

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
	authenticate,
	async (c: LucidHonoContext) => {
		const user = await serviceWrapper(accountServices.getAuthenticatedUser, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_user_fetch_error_name"),
				message: T("route_user_fetch_error_message"),
			},
		})(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{
				userId: c.get("auth").id,
				authUser: c.get("auth"),
			},
		);
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
