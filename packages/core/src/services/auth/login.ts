import formatter from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import { decrypt } from "../../utils/helpers/encrypt-decrypt.js";
import { trimStringInput } from "../../utils/helpers/normalize-input.js";
import type { ServiceFn } from "../../utils/services/types.js";
import verifyPassword from "./verify-password.js";

/** Checks a login's password. Run it without an outer transaction so wrong passwords stay counted. */
const login: ServiceFn<
	[
		{
			usernameOrEmail: string;
			password: string;
			/** Where the login came from, which limits wrong passwords per address. */
			address?: string | null;
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
				message: copy(
					"server:core.auth.password.authentication.disabled.message",
				),
			},
			data: undefined,
		};
	}

	const Users = new UsersRepository(context.db);
	const usernameOrEmail = trimStringInput(data.usernameOrEmail);

	const userRes = await Users.selectSingleByEmailUsername({
		select: ["id", "password", "is_deleted", "is_locked", "secret"],
		where: {
			username: usernameOrEmail,
			email: usernameOrEmail.toLowerCase(),
		},
	});
	if (userRes.error) return userRes;

	const user = userRes.data;
	const passwordRes = await verifyPassword(context, {
		account: user ? { userId: user.id } : { identifier: usernameOrEmail },
		address: data.address,
		password: data.password,
		stored: user?.password
			? {
					hash: user.password,
					salt: decrypt(user.secret, context.config.secrets.encryption),
				}
			: null,
	});
	if (passwordRes.error) return passwordRes;
	if (!user || !passwordRes.data) {
		return {
			error: {
				type: "authorisation",
				message: copy("server:core.auth.login.error.message"),
				status: 401,
			},
			data: undefined,
		};
	}

	//* Check the password before revealing account status.
	if (formatter.formatBoolean(user.is_deleted)) {
		return {
			error: {
				type: "authorisation",
				message: copy("server:core.auth.login.suspended.error.message"),
				status: 401,
			},
			data: undefined,
		};
	}

	if (formatter.formatBoolean(user.is_locked)) {
		return {
			error: {
				type: "authorisation",
				message: copy("server:core.auth.login.locked.error.message"),
				status: 401,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			id: user.id,
		},
	};
};

export default login;
