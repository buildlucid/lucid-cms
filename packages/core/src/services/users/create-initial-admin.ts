import { scrypt } from "@noble/hashes/scrypt.js";
import constants from "../../constants/constants.js";
import formatter from "../../libs/formatters/index.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import generateSecret from "../../utils/helpers/generate-secret.js";
import { normalizeEmailInput } from "../../utils/helpers/normalize-input.js";
import type { ServiceFn } from "../../utils/services/types.js";

const createInitialAdmin: ServiceFn<
	[
		{
			email: string;
			username: string;
			firstName?: string;
			lastName?: string;
			password: string;
		},
	],
	number
> = async (context, data) => {
	const Users = new UsersRepository(context.db.client, context.config.db);
	const email = normalizeEmailInput(data.email);

	const userCountRes = await Users.count({ where: [] });
	if (userCountRes.error) return userCountRes;

	if (formatter.parseCount(userCountRes.data?.count) > 0) {
		return {
			error: {
				type: "basic",
				message: T("setup_already_completed"),
				status: 400,
			},
			data: undefined,
		};
	}

	const { secret, encryptSecret } = generateSecret(
		context.config.secrets.encryption,
	);
	const hashedPassword = Buffer.from(
		scrypt(data.password, secret, constants.scrypt),
	).toString("base64");

	const newUserRes = await Users.createSingle({
		data: {
			email: email,
			username: data.username,
			first_name: data.firstName,
			last_name: data.lastName,
			super_admin: true,
			triggered_password_reset: false,
			is_locked: false,
			password: hashedPassword,
			secret: encryptSecret,
			invitation_accepted: true,
		},
		returning: ["id"],
		validation: { enabled: true },
	});
	if (newUserRes.error) return newUserRes;

	return {
		error: undefined,
		data: newUserRes.data.id,
	};
};

export default createInitialAdmin;
