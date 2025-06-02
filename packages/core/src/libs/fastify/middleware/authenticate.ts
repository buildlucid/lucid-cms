import { LucidAPIError } from "../../../utils/errors/index.js";
import type { FastifyRequest } from "fastify";

const authenticate = async (request: FastifyRequest) => {
	// const accessTokenRes =
	// 	request.server.services.auth.accessToken.verifyToken(request);
	// if (accessTokenRes.error) throw new LucidAPIError(accessTokenRes.error);
	// request.auth = accessTokenRes.data;
};

export default authenticate;
