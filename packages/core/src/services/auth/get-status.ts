import { verify } from "hono/jwt";
import constants from "../../constants/constants.js";
import { copy } from "../../libs/i18n/index.js";
import { UserTokensRepository } from "../../libs/repositories/index.js";
import hashUserToken from "../../utils/helpers/hash-user-token.js";
import type { ServiceFn } from "../../utils/services/types.js";

type StatusTokens = {
	accessToken?: string;
	refreshToken?: string;
};

const readUserId = async (
	token: string | undefined,
	secret: string,
): Promise<number | null> => {
	if (!token) return null;
	try {
		const payload = await verify(token, secret, constants.jwt.algorithm);
		return typeof payload.id === "number" && Number.isInteger(payload.id)
			? payload.id
			: null;
	} catch {
		return null;
	}
};

/** Resolves whether browser tokens represent an active session without rotating them. */
const getStatus: ServiceFn<[StatusTokens], undefined> = async (
	context,
	tokens,
) => {
	const accessUserId = await readUserId(
		tokens.accessToken,
		context.config.secrets.accessToken,
	);
	if (accessUserId !== null) {
		return { error: undefined, data: undefined };
	}

	const refreshUserId = await readUserId(
		tokens.refreshToken,
		context.config.secrets.refreshToken,
	);
	if (refreshUserId === null || !tokens.refreshToken) {
		return {
			error: {
				type: "authorisation",
				code: "authorisation",
				status: 401,
				message: copy("server:core.permissions.unauthorized"),
			},
			data: undefined,
		};
	}

	const UserTokens = new UserTokensRepository(
		context.db.client,
		context.config.db,
	);
	const tokenRes = await UserTokens.selectSingle({
		select: ["user_id"],
		where: [
			{
				key: "token",
				operator: "=",
				value: hashUserToken(tokens.refreshToken),
			},
			{
				key: "token_type",
				operator: "=",
				value: constants.userTokens.refresh,
			},
			{
				key: "revoked_at",
				operator: "is",
				value: null,
			},
			{
				key: "expiry_date",
				operator: ">",
				value: new Date().toISOString(),
			},
		],
	});
	if (tokenRes.error) return tokenRes;

	if (!tokenRes.data || tokenRes.data.user_id !== refreshUserId) {
		return {
			error: {
				type: "authorisation",
				code: "authorisation",
				status: 401,
				message: copy("server:core.permissions.unauthorized"),
			},
			data: undefined,
		};
	}

	return { error: undefined, data: undefined };
};

export default getStatus;
