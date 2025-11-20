import { scrypt } from "@noble/hashes/scrypt.js";
import constants from "../../constants/constants.js";
import formatter from "../../libs/formatters/index.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
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
	if (context.config.auth.password.enabled === false) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: T("password_authentication_disabled_message"),
			},
			data: undefined,
		};
	}

	const Users = new UsersRepository(context.db, context.config.db);

	const userRes = await Users.selectSingleByEmailUsername({
		select: ["id", "password", "is_deleted", "is_locked", "secret"],
		where: {
			username: data.usernameOrEmail,
			email: data.usernameOrEmail,
		},
		validation: {
			enabled: true,
			defaultError: {
				type: "authorisation",
				message: T("login_error_message"),
				status: 401,
			},
		},
	});
	if (userRes.error) return userRes;

	if (formatter.formatBoolean(userRes.data.is_deleted)) {
		return {
			error: {
				type: "authorisation",
				message: T("login_suspended_error_message"),
				status: 401,
			},
			data: undefined,
		};
	}

	if (formatter.formatBoolean(userRes.data.is_locked)) {
		return {
			error: {
				type: "authorisation",
				message: T("login_locked_error_message"),
				status: 401,
			},
			data: undefined,
		};
	}

	const decryptedSecret = decrypt(
		userRes.data.secret,
		context.config.keys.encryptionKey,
	);
	const inputPasswordHash = Buffer.from(
		scrypt(data.password, decryptedSecret, constants.scrypt),
	).toString("base64");

	const valid = inputPasswordHash === userRes.data.password;

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
			id: userRes.data.id,
		},
	};
};

export default login;
