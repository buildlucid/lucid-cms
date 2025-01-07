import jwt from "jsonwebtoken";
import constants from "../../../constants/constants.js";
import Repository from "../../../libs/repositories/index.js";
import type { FastifyRequest, FastifyReply } from "fastify";
import type { ServiceResponse } from "../../../utils/services/types.js";

const clearToken = async (
	request: FastifyRequest,
	reply: FastifyReply,
): ServiceResponse<undefined> => {
	const _refresh = request.cookies[constants.headers.refreshToken];
	if (!_refresh) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const UserTokens = Repository.get(
		"user-tokens",
		request.server.config.db.client,
		request.server.config.db,
	);

	const decode = jwt.verify(
		_refresh,
		request.server.config.keys.refreshTokenSecret,
	) as {
		id: number;
	};

	reply.clearCookie(constants.headers.refreshToken, { path: "/" });

	const deleteMultipleTokenRes = await UserTokens.deleteMultiple({
		where: [
			{
				key: "token",
				operator: "=",
				value: _refresh,
			},
			{
				key: "token_type",
				operator: "=",
				value: "refresh",
			},
			{
				key: "user_id",
				operator: "=",
				value: decode.id,
			},
		],
	});
	if (deleteMultipleTokenRes.error) return deleteMultipleTokenRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default clearToken;
