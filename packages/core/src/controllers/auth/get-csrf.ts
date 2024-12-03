import authSchema from "../../schemas/auth.js";
import { swaggerResponse } from "../../utils/swagger/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const getCSRFController: RouteController<
	typeof authSchema.getCSRF.params,
	typeof authSchema.getCSRF.body,
	typeof authSchema.getCSRF.query
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
			"This route returns a CSRF token in the response body and also sets a _csrf httpOnly cookie. The client can use this token on required routes by setting a _csrf header. On required routes this header will be checked against the _csrf cookie.",
		tags: ["auth"],
		summary: "Returns a CSRF token",
		response: {
			200: swaggerResponse({
				type: 200,
				data: {
					type: "object",
					properties: {
						_csrf: { type: "string" },
					},
				},
			}),
		},
	},
};
