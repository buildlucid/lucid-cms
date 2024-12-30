import constants from "../../../constants/constants.js";
import jwt from "jsonwebtoken";
import type { ServiceResponse } from "../../../utils/services/types.js";
import type { FastifyRequest, FastifyReply } from "fastify";

const generateToken = async (
	reply: FastifyReply,
	request: FastifyRequest,
	userId: number,
): ServiceResponse<undefined> => {
	try {
		const userRes = await request.server.services.user.getSingle(
			{
				db: request.server.config.db.client,
				config: request.server.config,
				services: request.server.services,
			},
			{
				userId: userId,
			},
		);
		if (userRes.error) return userRes;

		const token = jwt.sign(
			{
				id: userRes.data.id,
				username: userRes.data.username,
				email: userRes.data.email,
				permissions: userRes.data.permissions,
				superAdmin: userRes.data.superAdmin ?? false,
			} satisfies FastifyRequest["auth"],
			request.server.config.keys.accessTokenSecret,
			{
				expiresIn: constants.accessTokenExpiration,
			},
		);

		reply.setCookie(constants.headers.accessToken, token, {
			maxAge: constants.accessTokenExpiration,
			httpOnly: true,
			secure: request.protocol === "https",
			sameSite: "strict",
			path: "/",
		});

		return {
			error: undefined,
			data: undefined,
		};
	} catch (err) {
		return {
			error: {
				type: "authorisation",
			},
			data: undefined,
		};
	}
};

export default generateToken;
