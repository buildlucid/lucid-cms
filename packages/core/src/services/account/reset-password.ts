import { scrypt } from "@noble/hashes/scrypt.js";
import constants from "../../constants/constants.js";
import {
	UsersRepository,
	UserTokensRepository,
} from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import {
	formatEmailSubject,
	generateSecret,
	getBaseUrl,
} from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { emailServices, userTokenServices } from "../index.js";

const resetPassword: ServiceFn<
	[
		{
			token: string;
			password: string;
		},
	],
	undefined
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

	const UserTokens = new UserTokensRepository(
		context.db.client,
		context.config.db,
	);
	const Users = new UsersRepository(context.db.client, context.config.db);

	const tokenRes = await userTokenServices.getSingle(context, {
		token: data.token,
		tokenType: constants.userTokens.passwordReset,
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
		context.config.secrets.encryption,
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

	const baseUrl = getBaseUrl(context);

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
		emailServices.sendEmail(context, {
			template: constants.emailTemplates.passwordResetSuccess,
			type: "internal",
			to: updatedUserRes.data.email,
			subject: formatEmailSubject(
				T("password_reset_success_subject"),
				context.config.brand?.name,
			),
			data: {
				firstName: updatedUserRes.data.first_name,
				lastName: updatedUserRes.data.last_name,
				logoUrl: `${baseUrl}${constants.assets.emailLogo}`,
				brand: {
					name: context.config.brand?.name,
				},
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
