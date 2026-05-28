import { add } from "date-fns";
import constants from "../../constants/constants.js";
import { serverText, translateServer } from "../../libs/i18n/index.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import type { ErrorText } from "../../types/errors.js";
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
		message: ErrorText;
	}
> = async (context, data) => {
	if (context.config.auth.password.enabled === false) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: serverText(
					"core.auth.password.authentication.disabled.message",
				),
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
				message: serverText("core.auth.password.reset.request.accepted"),
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
			translateServer("core.email.password.reset.email.subject", undefined, {
				config: context.config,
			}),
			context.config.brand?.name,
		),
		template: constants.email.templates.resetPassword.key,
		data: {
			firstName: userExistsRes.data.first_name,
			lastName: userExistsRes.data.last_name,
			email: userExistsRes.data.email,
			resetLink: `${baseUrl}${constants.email.locations.resetPassword}?token=${userToken.data.token}`,
			logoUrl: `${baseUrl}${constants.email.assets.logo}`,
			brand: {
				name: context.config.brand?.name,
			},
		},
		storage: constants.email.templates.resetPassword.storage,
	});
	if (sendEmail.error) return sendEmail;

	return {
		error: undefined,
		data: {
			message: serverText("core.auth.password.reset.request.accepted"),
		},
	};
};

export default sendResetPassword;
