import { createFactory } from "hono/factory";
import constants from "../../../../../constants/constants.js";
import { controllerSchemas } from "../../../../../schemas/auth.js";
import {
	authServices,
	userLoginServices,
} from "../../../../../services/index.js";
import { LucidError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import rateLimiter from "../../../middleware/rate-limiter.js";
import validateCSRF from "../../../middleware/validate-csrf.js";
import validate from "../../../middleware/validate.js";
import openAPI from "../../../openapi/index.js";
import createServiceContext from "../../../utils/create-service-context.js";
import getClientAddress from "../../../utils/get-client-address.js";

const factory = createFactory();

const acceptInvitationPasskeyController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Accepts an invitation with a new passkey instead of a password, made with the invitation's passkey options, then logs the user in, setting a refresh and access token as httpOnly cookies. The passkey checked who's holding the device, so there's no two-factor step.",
		tags: ["auth"],
		summary: "Accept Invitation With Passkey",
		responses: openAPI.responses(),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
			},
			params: controllerSchemas.acceptInvitationPasskey.params,
		}),
		requestBody: openAPI.requestBody(
			controllerSchemas.acceptInvitationPasskey.body,
		),
	})),
	validateCSRF(),
	rateLimiter({
		mode: "ip",
		limit: constants.rateLimit.scopes.sensitive.limit,
		scope: constants.rateLimit.scopes.sensitive.scopeKey,
		windowMs: 60_000,
	}),
	validate("param", controllerSchemas.acceptInvitationPasskey.params),
	validate("json", controllerSchemas.acceptInvitationPasskey.body),
	async (c) => {
		const { token } = c.req.valid("param");
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const userRes = await serviceWrapper(
			authServices.invitation.acceptInvitation,
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
			passkey: body,
		});
		if (userRes.error) throw new LucidError(userRes.error);

		//* the new passkey checked who's holding the device, so there's no challenge step
		const [refreshRes, accessRes] = await Promise.all([
			authServices.refreshToken.generateToken(c, userRes.data.id),
			authServices.accessToken.generateToken(c, userRes.data.id),
		]);
		if (refreshRes.error) throw new LucidError(refreshRes.error);
		if (accessRes.error) throw new LucidError(accessRes.error);

		const userAgent = c.req.header("user-agent") || null;

		const userLoginTrackRes = await serviceWrapper(
			userLoginServices.createSingle,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.login.error.name"),
					message: copy("server:core.routes.login.error.message"),
				},
			},
		)(context, {
			userId: userRes.data.id,
			tokenId: refreshRes.data.tokenId,
			authMethod: "invitation",
			ipAddress: getClientAddress(c),
			userAgent: userAgent,
		});
		if (userLoginTrackRes.error) throw new LucidError(userLoginTrackRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default acceptInvitationPasskeyController;
