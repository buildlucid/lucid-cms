import { describeRoute } from "hono-openapi";
import { createFactory } from "hono/factory";
import z from "zod";
import constants from "../../../../../constants/constants.js";
import { controllerSchemas } from "../../../../../schemas/auth.js";
import {
	authServices,
	userLoginServices,
} from "../../../../../services/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import rateLimiter from "../../../middleware/rate-limiter.js";
import validateCSRF from "../../../middleware/validate-csrf.js";
import validate from "../../../middleware/validate.js";
import verifyCaptcha from "../../../middleware/verify-captcha.js";
import openAPI from "../../../openapi/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const acceptInvitationController = factory.createHandlers(
	describeRoute({
		description:
			"Accepts an invitation and sets the user's password. When password login is disabled, no password is needed and the user is logged in straight away, setting a refresh and access token as httpOnly cookies, unless two-factor authentication has to be set up first.",
		tags: ["auth"],
		summary: "Accept Invitation",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.acceptInvitation.response),
		}),
		parameters: openAPI.parameters({
			headers: {
				csrf: true,
				captcha: false,
			},
			params: controllerSchemas.acceptInvitation.params,
		}),
		requestBody: openAPI.requestBody(controllerSchemas.acceptInvitation.body),
	}),
	validateCSRF(),
	rateLimiter({
		mode: "ip",
		limit: constants.rateLimit.scopes.sensitive.limit,
		scope: constants.rateLimit.scopes.sensitive.scopeKey,
		windowMs: 60_000,
	}),
	verifyCaptcha("acceptInvitation"),
	validate("param", controllerSchemas.acceptInvitation.params),
	validate("json", controllerSchemas.acceptInvitation.body),
	async (c) => {
		const { token } = c.req.valid("param");
		const { password } = c.req.valid("json");
		const context = createServiceContext(c);

		const acceptInvitation = await serviceWrapper(
			authServices.invitation.acceptInvitation,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.accept.invitation.error.name"),
					message: copy("server:core.routes.accept.invitation.error.message"),
				},
			},
		)(context, {
			token: token,
			password: password,
		});

		if (acceptInvitation.error) throw new LucidAPIError(acceptInvitation.error);

		//* without a password to log in with, accepting the emailed invitation logs the user in
		if (context.config.auth.password.enabled === false) {
			const challengeRes = await authServices.twoFactor.startChallenge(c, {
				userId: acceptInvitation.data.id,
				authMethod: "invitation",
			});
			if (challengeRes.error) throw new LucidAPIError(challengeRes.error);
			if (challengeRes.data) {
				c.status(200);
				return c.json(
					formatAPIResponse(c, {
						data: { twoFactor: challengeRes.data.step },
					}),
				);
			}

			const [refreshRes, accessRes] = await Promise.all([
				authServices.refreshToken.generateToken(c, acceptInvitation.data.id),
				authServices.accessToken.generateToken(c, acceptInvitation.data.id),
			]);
			if (refreshRes.error) throw new LucidAPIError(refreshRes.error);
			if (accessRes.error) throw new LucidAPIError(accessRes.error);

			const connectionInfo = c.get("runtimeContext").getConnectionInfo(c);
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
				userId: acceptInvitation.data.id,
				tokenId: refreshRes.data.tokenId,
				authMethod: "invitation",
				ipAddress: connectionInfo.address ?? null,
				userAgent: userAgent,
			});
			if (userLoginTrackRes.error)
				throw new LucidAPIError(userLoginTrackRes.error);
		}

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: { twoFactor: null },
			}),
		);
	},
);

export default acceptInvitationController;
