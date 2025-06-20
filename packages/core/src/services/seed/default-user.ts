import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import constants from "../../constants/constants.js";
import { scrypt } from "@noble/hashes/scrypt.js";
import { generateSecret } from "../../utils/helpers/index.js";
import type { ServiceContext, ServiceFn } from "../../utils/services/types.js";

const defaultUser: ServiceFn<[], undefined> = async (
	context: ServiceContext,
) => {
	try {
		const Users = Repository.get("users", context.db, context.config.db);

		const totalUserCountRes = await Users.count({
			where: [],
		});
		if (totalUserCountRes.error) return totalUserCountRes;

		if (Formatter.parseCount(totalUserCountRes.data?.count) > 0) {
			return {
				error: undefined,
				data: undefined,
			};
		}

		const { secret, encryptSecret } = generateSecret(
			context.config.keys.encryptionKey,
		);

		const hashedPassword = Buffer.from(
			scrypt(constants.seedDefaults.user.password, secret, constants.scrypt),
		).toString("base64");

		const userRes = await Users.createSingle({
			data: {
				super_admin: constants.seedDefaults.user.superAdmin,
				email: constants.seedDefaults.user.email,
				username: constants.seedDefaults.user.username,
				first_name: constants.seedDefaults.user.firstName,
				last_name: constants.seedDefaults.user.lastName,
				triggered_password_reset: true,
				password: hashedPassword,
				secret: encryptSecret,
			},
			returning: ["id"],
			validation: {
				enabled: true,
			},
		});
		if (userRes.error) return userRes;

		return {
			error: undefined,
			data: undefined,
		};
	} catch (error) {
		return {
			error: {
				type: "basic",
				message: T("user_error_occured_saving_default"),
			},
			data: undefined,
		};
	}
};

export default defaultUser;
