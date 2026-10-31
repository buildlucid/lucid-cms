import { describeRoute } from "hono-openapi";
import { createFactory } from "hono/factory";
import z from "zod";
import constants from "../../../../../constants/constants.js";
import { controllerSchemas } from "../../../../../schemas/auth.js";
import { authServices } from "../../../../../services/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import rateLimiter from "../../../middleware/rate-limiter.js";
import validateCSRF from "../../../middleware/validate-csrf.js";
import validate from "../../../middleware/validate.js";
import openAPI from "../../../openapi/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const invitationPasskeyOptionsController = factory.createHandlers(
	describeRoute({
		description:
			"Creates the options for accepting an invitation with a passkey instead of a password. Pass them to the browser, then send its response with the accept invitation request.",
		tags: ["auth"],
		summary: "Invitation Passkey Options",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(
				controllerSchemas.invitationPasskeyOptions.response,
			),
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
			params: controllerSchemas.invitationPasskeyOptions.params,
		}),
	}),
	validateCSRF(),
	rateLimiter({
		mode: "ip",
		limit: constants.rateLimit.scopes.sensitive.limit,
		scope: constants.rateLimit.scopes.sensitive.scopeKey,
		windowMs: 60_000,
	}),
	validate("param", controllerSchemas.invitationPasskeyOptions.params),
	async (c) => {
		const { token } = c.req.valid("param");
		const context = createServiceContext(c);

		const optionsRes = await serviceWrapper(
			authServices.invitation.createPasskeyOptions,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.accept.invitation.error.name"),
					message: copy("server:core.routes.accept.invitation.error.message"),
				},
			},
		)(context, {
			token: token,
		});
		if (optionsRes.error) throw new LucidAPIError(optionsRes.error);

		c.header("Cache-Control", "private, no-store");
		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: optionsRes.data,
			}),
		);
	},
);

export default invitationPasskeyOptionsController;
