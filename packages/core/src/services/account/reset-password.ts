import T from "../../translations/index.js";
import { scrypt } from "@noble/hashes/scrypt.js";
import constants from "../../constants/constants.js";
import Repository from "../../libs/repositories/index.js";
import { generateSecret } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const resetPassword: ServiceFn<
	[
		{
			token: string;
			password: string;
		},
	],
	undefined
> = async (context, data) => {
	const UserTokens = Repository.get(
		"user-tokens",
		context.db,
		context.config.db,
	);
	const Users = Repository.get("users", context.db, context.config.db);

	const tokenRes = await context.services.user.token.getSingle(context, {
		token: data.token,
		tokenType: "password_reset",
	});
	if (tokenRes.error) return tokenRes;

	const userRes = await Users.selectSingle({
		select: ["id"],
		where: [
			{
				key: "id",
				operator: "=",
				value: tokenRes.data.user_id,
			},
		],
		validation: {
			enabled: true,
			defaultError: {
				status: 404,
				message: T("user_not_found_message"),
			},
		},
	});
	if (userRes.error) return userRes;

	const { secret, encryptSecret } = generateSecret(
		context.config.keys.encryptionKey,
	);

	const hashedPassword = Buffer.from(
		scrypt(data.password, secret, constants.scrypt),
	).toString("base64");

	const updatedUserRes = await Users.updateSingle({
		data: {
			password: hashedPassword,
			secret: encryptSecret,
			updated_at: new Date().toISOString(),
		},
		where: [
			{
				key: "id",
				operator: "=",
				value: tokenRes.data.user_id,
			},
		],
		returning: ["id", "first_name", "last_name", "email"],
		validation: {
			enabled: true,
			defaultError: {
				status: 400,
			},
		},
	});
	if (updatedUserRes.error) return updatedUserRes;

	const [deleteMultipleTokensRes, sendEmail] = await Promise.all([
		UserTokens.deleteMultiple({
			where: [
				{
					key: "id",
					operator: "=",
					value: tokenRes.data.id,
				},
			],
		}),
		context.services.email.sendEmail(context, {
			template: constants.emailTemplates.passwordResetSuccess,
			type: "internal",
			to: updatedUserRes.data.email,
			subject: T("password_reset_success_subject"),
			data: {
				firstName: updatedUserRes.data.first_name,
				lastName: updatedUserRes.data.last_name,
			},
		}),
	]);
	if (deleteMultipleTokensRes.error) return deleteMultipleTokensRes;
	if (sendEmail.error) return sendEmail;

	return {
		error: undefined,
		data: undefined,
	};
};

export default resetPassword;
