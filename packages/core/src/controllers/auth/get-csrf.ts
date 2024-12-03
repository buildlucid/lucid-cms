import authSchema from "../../schemas/auth.js";
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
};
