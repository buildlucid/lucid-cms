import { LucidAPIError } from "../../../utils/errors/index.js";
import type { FastifyRequest } from "fastify";

const validateCSRF = async (request: FastifyRequest) => {
	// const verifyCSRFRes = request.server.services.auth.csrf.verifyToken(request);
	// if (verifyCSRFRes.error) throw new LucidAPIError(verifyCSRFRes.error);
};

export default validateCSRF;
