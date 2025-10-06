import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import validate from "../../middleware/validate.js";
import { controllerSchemas } from "../../../../schemas/auth.js";
import { describeRoute } from "hono-openapi";
import services from "../../../../services/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIResponse,
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
} from "../../../../utils/open-api/index.js";
import validateCSRF from "../../middleware/validate-csrf.js";

const factory = createFactory();

const loginController = factory.createHandlers(
	describeRoute({
		description:
			"Authenticates a user and sets a refresh and access token as httpOnly cookies.",
		tags: ["auth"],
		summary: "Login",
		responses: honoOpenAPIResponse(),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.login.body),
		validateResponse: true,
	}),
	validateCSRF,
	validate("json", controllerSchemas.login.body),
	async (c) => {
		const { usernameOrEmail, password } = c.req.valid("json");

		const userRes = await serviceWrapper(services.auth.login, {
			transaction: false,
			defaultError: {
				type: "basic",
				code: "login",
				name: T("route_login_error_name"),
				message: T("route_login_error_message"),
			},
		})(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
			},
			{
				usernameOrEmail: usernameOrEmail,
				password: password,
			},
		);
		if (userRes.error) throw new LucidAPIError(userRes.error);

		const [refreshRes, accessRes] = await Promise.all([
			services.auth.refreshToken.generateToken(c, userRes.data.id),
			services.auth.accessToken.generateToken(c, userRes.data.id),
		]);
		if (refreshRes.error) throw new LucidAPIError(refreshRes.error);
		if (accessRes.error) throw new LucidAPIError(accessRes.error);

		const connectionInfo = c.get("runtimeContext").getConnectionInfo(c);
		const userAgent = c.req.header("user-agent") || null;

		const userLoginTrackRes = await serviceWrapper(
			services.userLogins.createSingle,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: T("route_login_error_name"),
					message: T("route_login_error_message"),
				},
			},
		)(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
			},
			{
				userId: userRes.data.id,
				tokenId: refreshRes.data.tokenId,
				authMethod: "password",
				ipAddress: connectionInfo.address ?? null,
				userAgent: userAgent,
			},
		);
		if (userLoginTrackRes.error)
			throw new LucidAPIError(userLoginTrackRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default loginController;
