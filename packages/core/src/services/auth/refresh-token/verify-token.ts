import T from "../../../translations/index.js";
import jwt from "jsonwebtoken";
import constants from "../../../constants/constants.js";
import Repository from "../../../libs/repositories/index.js";
import type { FastifyRequest, FastifyReply } from "fastify";
import type { ServiceResponse } from "../../../utils/services/types.js";

const verifyToken = async (
	request: FastifyRequest,
	reply: FastifyReply,
): ServiceResponse<{
	user_id: number;
}> => {
	try {
		const _refresh = request.cookies[constants.headers.refreshToken];

		if (!_refresh) {
			return {
				error: {
					type: "authorisation",
					name: T("refresh_token_error_name"),
					message: T("no_refresh_token_found"),
				},
				data: undefined,
			};
		}

		const UserTokensRepo = Repository.get(
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

		const token = await UserTokensRepo.selectSingle({
			select: ["id", "user_id"],
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
				{
					key: "expiry_date",
					operator: ">",
					value: new Date().toISOString(),
				},
			],
		});

		if (token === undefined) {
			return {
				error: {
					type: "authorisation",
					name: T("refresh_token_error_name"),
					message: T("no_refresh_token_found"),
				},
				data: undefined,
			};
		}

		return {
			error: undefined,
			data: {
				user_id: token.user_id as number,
			},
		};
	} catch (err) {
		const [refreshRes, accessRes] = await Promise.all([
			request.server.services.auth.refreshToken.clearToken(request, reply),
			request.server.services.auth.accessToken.clearToken(reply),
		]);
		if (refreshRes.error) return refreshRes;
		if (accessRes.error) return accessRes;

		return {
			error: {
				type: "authorisation",
				name: T("refresh_token_error_name"),
				message: T("refresh_token_error_message"),
			},
			data: undefined,
		};
	}
};

export default verifyToken;
