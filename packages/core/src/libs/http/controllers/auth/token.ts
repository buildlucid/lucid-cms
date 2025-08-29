import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import services from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIResponse,
	honoOpenAPIParamaters,
} from "../../../../utils/open-api/index.js";
import validateCSRF from "../../middleware/validate-csrf.js";

const factory = createFactory();

const tokenController = factory.createHandlers(
	describeRoute({
		description:
			"Verifies the refresh token and issues a new access and refresh token.",
		tags: ["auth"],
		summary: "Refresh Token",
		responses: honoOpenAPIResponse(),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
		}),
		validateResponse: true,
	}),
	validateCSRF,
	async (c) => {
		const payloadRes = await services.auth.refreshToken.verifyToken(c);
		if (payloadRes.error) throw new LucidAPIError(payloadRes.error);

		const [refreshRes, accessRes] = await Promise.all([
			services.auth.refreshToken.generateToken(c, payloadRes.data.user_id),
			services.auth.accessToken.generateToken(c, payloadRes.data.user_id),
		]);

		if (refreshRes.error) throw new LucidAPIError(refreshRes.error);
		if (accessRes.error) throw new LucidAPIError(accessRes.error);

		c.status(204);
		return c.body(null);
	},
);

export default tokenController;
