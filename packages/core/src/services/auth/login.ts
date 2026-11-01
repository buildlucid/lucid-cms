import formatter from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import { decrypt } from "../../utils/helpers/encrypt-decrypt.js";
import hashSecret from "../../utils/helpers/hash-secret.js";
import { trimStringInput } from "../../utils/helpers/normalize-input.js";
import verifySecret from "../../utils/helpers/verify-secret.js";
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
	if (!user?.password) {
		//* Hash for unknown accounts too, reducing account enumeration through timing.
		await hashSecret(data.password, "lucid-login");
		return {
			error: {
				type: "authorisation",
				message: copy("server:core.auth.login.error.message"),
				status: 401,
			},
			data: undefined,
		};
	}

	const valid = await verifySecret(
		data.password,
		decrypt(user.secret, context.config.secrets.encryption),
		user.password,
	);
	if (!valid) {
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
