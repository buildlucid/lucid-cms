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
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import permissions from "../../middleware/permissions.js";
import { Permissions } from "../../../permission/definitions.js";

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
		validateResponse: true,
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
				db: c.get("config").db.client,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
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
