import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/users.js";
import { userServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";

const factory = createFactory();

const resendInvitationController = factory.createHandlers(
	describeRoute({
		description:
			"Resend an invitation email to a user who has not yet accepted their invitation.",
		tags: ["users"],
		summary: "Resend User Invitation",
		responses: honoOpenAPIResponse(),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.resendInvitation.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.CreateUser]),
	validate("param", controllerSchemas.resendInvitation.params),
	async (c) => {
		const { id } = c.req.valid("param");

		const resendRes = await serviceWrapper(userServices.resendInvitation, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_user_create_error_name"),
				message: T("route_user_create_error_message"),
			},
		})(
			{
				db: c.get("config").db,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
				requestUrl: c.req.url,
			},
			{
				userId: Number.parseInt(id, 10),
			},
		);
		if (resendRes.error) throw new LucidAPIError(resendRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default resendInvitationController;
