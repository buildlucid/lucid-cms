import z from "zod/v4";
import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/roles.js";
import { describeRoute } from "hono-openapi";
import { roleServices } from "../../../../services/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIResponse,
	honoOpenAPIParamaters,
} from "../../../../utils/open-api/index.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";

const factory = createFactory();

const getSingleController = factory.createHandlers(
	describeRoute({
		description: "Returns a single role based on the given ID.",
		tags: ["roles"],
		summary: "Get Role",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getSingle.response),
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.getSingle.params,
		}),
		validateResponse: true,
	}),
	authenticate,
	validate("param", controllerSchemas.getSingle.params),
	async (c) => {
		const { id } = c.req.valid("param");

		const role = await serviceWrapper(roleServices.getSingle, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_roles_fetch_error_name"),
				message: T("route_roles_fetch_error_message"),
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
				id: Number.parseInt(id, 10),
			},
		);
		if (role.error) throw new LucidAPIError(role.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: role.data,
			}),
		);
	},
);

export default getSingleController;
