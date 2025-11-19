import T from "../../../../../translations/index.js";
import { createFactory } from "hono/factory";
import validate from "../../../middleware/validate.js";
import { controllerSchemas } from "../../../../../schemas/auth.js";
import { describeRoute } from "hono-openapi";
import { authServices } from "../../../../../services/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import {
	honoOpenAPIResponse,
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
} from "../../../../../utils/open-api/index.js";
import validateCSRF from "../../../middleware/validate-csrf.js";

const factory = createFactory();

const acceptInvitationController = factory.createHandlers(
	describeRoute({
		description:
			"Accepts an invitation and sets the user's password. This will mark the invitation as accepted.",
		tags: ["auth"],
		summary: "Accept Invitation",
		responses: honoOpenAPIResponse(),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
			params: controllerSchemas.acceptInvitation.params,
		}),
		requestBody: honoOpenAPIRequestBody(
			controllerSchemas.acceptInvitation.body,
		),
		validateResponse: true,
	}),
	validateCSRF,
	validate("param", controllerSchemas.acceptInvitation.params),
	validate("json", controllerSchemas.acceptInvitation.body),
	async (c) => {
		const { token } = c.req.valid("param");
		const { password } = c.req.valid("json");

		const acceptInvitation = await serviceWrapper(
			authServices.invitation.acceptInvitation,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_accept_invitation_error_name"),
					message: T("route_accept_invitation_error_message"),
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
				token: token,
				password: password,
			},
		);

		if (acceptInvitation.error) throw new LucidAPIError(acceptInvitation.error);

		c.status(204);
		return c.body(null);
	},
);

export default acceptInvitationController;
