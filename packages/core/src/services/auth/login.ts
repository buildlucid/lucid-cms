import T from "../../translations/index.js";
import argon2 from "argon2";
import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import { decrypt } from "../../utils/helpers/encrypt-decrypt.js";
import type { ServiceFn } from "../../utils/services/types.js";

const login: ServiceFn<
	[
		{
			usernameOrEmail: string;
			password: string;
		},
	],
	{
		id: number;
	}
> = async (context, data) => {
	const UsersRepo = Repository.get("users", context.db, context.config.db);

	const user = await UsersRepo.selectSingleByEmailUsername({
		select: ["id", "password", "is_deleted", "secret"],
		data: {
			username: data.usernameOrEmail,
			email: data.usernameOrEmail,
		},
	});

	if (!user || !user.password) {
		return {
			error: {
				type: "authorisation",
				message: T("login_error_message"),
				status: 401,
			},
			data: undefined,
		};
	}

	if (user !== undefined && Formatter.formatBoolean(user.is_deleted)) {
		return {
			error: {
				type: "authorisation",
				message: T("login_suspended_error_message"),
				status: 401,
			},
			data: undefined,
		};
	}

	const valid = await argon2.verify(user.password, data.password, {
		secret: Buffer.from(
			decrypt(user.secret, context.config.keys.encryptionKey),
		),
	});
	if (!valid)
		return {
			error: {
				type: "authorisation",
				message: T("login_error_message"),
				status: 401,
			},
			data: undefined,
		};

	return {
		error: undefined,
		data: {
			id: user.id,
		},
	};
};

export default login;
