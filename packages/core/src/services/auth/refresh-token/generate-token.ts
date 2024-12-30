import jwt from "jsonwebtoken";
import constants from "../../../constants/constants.js";
import Repository from "../../../libs/repositories/index.js";
import clearToken from "./clear-token.js";
import type { FastifyRequest, FastifyReply } from "fastify";
import type { ServiceResponse } from "../../../utils/services/types.js";

const generateToken = async (
	reply: FastifyReply,
	request: FastifyRequest,
	userId: number,
): ServiceResponse<undefined> => {
	const clearRes = await clearToken(request, reply);
	if (clearRes.error) return clearRes;

	const UserTokensRepo = Repository.get(
		"user-tokens",
		request.server.config.db.client,
		request.server.config.db,
	);

	const token = jwt.sign(
		{
			id: userId,
		},
		request.server.config.keys.refreshTokenSecret,
		{
			expiresIn: constants.refreshTokenExpiration,
		},
	);

	reply.setCookie(constants.headers.refreshToken, token, {
		maxAge: constants.refreshTokenExpiration,
		httpOnly: true,
		secure: request.protocol === "https",
		sameSite: "strict",
		path: "/",
	});

	await UserTokensRepo.createSingle({
		userId: userId,
		token: token,
		tokenType: "refresh",
		expiryDate: new Date(
			Date.now() + constants.refreshTokenExpiration * 1000, // convert to ms
		).toISOString(),
	});

	return {
		error: undefined,
		data: undefined,
	};
};

export default generateToken;
