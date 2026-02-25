import { add } from "date-fns";
import constants from "../../constants/constants.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import { formatEmailSubject, getBaseUrl } from "../../utils/helpers/index.js";
import { normalizeEmailInput } from "../../utils/helpers/normalize-input.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { emailServices, userTokenServices } from "../index.js";

const sendResetPassword: ServiceFn<
	[
		{
			email: string;
		},
	],
	{
		message: string;
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

	const Users = new UsersRepository(context.db.client, context.config.db);
	const email = normalizeEmailInput(data.email);

	const userExistsRes = await Users.selectSingle({
		select: ["id", "first_name", "last_name", "email"],
		where: [
			{
				key: "email",
				operator: "=",
				value: email,
			},
		],
	});
	if (userExistsRes.error) return userExistsRes;
	if (userExistsRes.data === undefined) {
		return {
			error: undefined,
			data: {
				message: T("if_account_exists_with_email_not_found"),
			},
		};
	}

	const expiryDate = add(new Date(), {
		minutes: constants.passwordResetTokenExpirationMinutes,
	}).toISOString();

	const userToken = await userTokenServices.createSingle(context, {
		userId: userExistsRes.data.id,
		tokenType: constants.userTokens.passwordReset,
		expiryDate: expiryDate,
	});
	if (userToken.error) return userToken;

	const baseUrl = getBaseUrl(context);

	const sendEmail = await emailServices.sendEmail(context, {
		type: "internal",
		to: userExistsRes.data.email,
		subject: formatEmailSubject(
			T("reset_password_email_subject"),
			context.config.brand?.name,
		),
		template: constants.emailTemplates.resetPassword,
		data: {
			firstName: userExistsRes.data.first_name,
			lastName: userExistsRes.data.last_name,
			email: userExistsRes.data.email,
			resetLink: `${baseUrl}${constants.locations.resetPassword}?token=${userToken.data.token}`,
			logoUrl: `${baseUrl}${constants.assets.emailLogo}`,
			brand: {
				name: context.config.brand?.name,
			},
		},
	});
	if (sendEmail.error) return sendEmail;

	return {
		error: undefined,
		data: {
			message: T("if_account_exists_with_email_not_found"),
		},
	};
};

export default sendResetPassword;
