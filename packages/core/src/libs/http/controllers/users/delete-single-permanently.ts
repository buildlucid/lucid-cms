import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/users.js";
import { describeRoute } from "hono-openapi";
import { userServices } from "../../../../services/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIResponse,
	honoOpenAPIParamaters,
} from "../../../../utils/open-api/index.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import permissions from "../../middleware/permissions.js";
import { Permissions } from "../../../permission/definitions.js";

const factory = createFactory();

const deleteSinglePermanentlyController = factory.createHandlers(
	describeRoute({
		description:
			"Permanently delete a single user by ID. The user must be soft-deleted first before it can be permanently deleted.",
		tags: ["users"],
		summary: "Delete User Permanently",
		responses: honoOpenAPIResponse({
			noProperties: true,
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.deleteSinglePermanently.params,
			headers: {
				csrf: true,
			},
		}),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.DeleteUser]),
	validate("param", controllerSchemas.deleteSinglePermanently.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const auth = c.get("auth");

		const deleteSinglePermanently = await serviceWrapper(
			userServices.deleteSinglePermanently,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_user_delete_error_name"),
					message: T("route_user_delete_error_message"),
				},
			},
		)(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{
				userId: Number.parseInt(id, 10),
				currentUserId: auth.id,
			},
		);
		if (deleteSinglePermanently.error)
			throw new LucidAPIError(deleteSinglePermanently.error);

		c.status(204);
		return c.body(null);
	},
);

export default deleteSinglePermanentlyController;
