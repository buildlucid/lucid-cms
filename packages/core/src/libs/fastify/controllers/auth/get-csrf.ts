import z from "zod";
import authSchema from "../../../../schemas/auth.js";
import { response } from "../../../../utils/swagger/index.js";
import formatAPIResponse from "../../../../utils/build-response.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const getCSRFController: RouteController<
	typeof authSchema.getCSRF.params,
	typeof authSchema.getCSRF.body,
	typeof authSchema.getCSRF.query.string,
	typeof authSchema.getCSRF.query.formatted
> = async (request, reply) => {
	const tokenRes = await request.server.services.auth.csrf.generateToken(
		request,
		reply,
	);
	if (tokenRes.error) throw new LucidAPIError(tokenRes.error);

	reply.status(200).send(
		formatAPIResponse(request, {
			data: {
				_csrf: tokenRes.data,
			},
		}),
	);
};

export default {
	controller: getCSRFController,
	zodSchema: authSchema.getCSRF,
	swaggerSchema: {
		description:
			"This endpoint returns a CSRF token in the response body as well as setting a _csrf httpOnly cookie. Some endpoints require this value to be passed via a _csrf header.",
		tags: ["auth"],
		summary: "CSRF Token",

		// querystring: z.toJSONSchema(authSchema.getCSRF.query.string),
		// body: z.toJSONSchema(authSchema.getCSRF.body),
		// params: z.toJSONSchema(authSchema.getCSRF.params),
		response: response({
			schema: z.toJSONSchema(authSchema.getCSRF.response),
		}),
	},
};
