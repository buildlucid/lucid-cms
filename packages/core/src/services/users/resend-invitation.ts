import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import { add } from "date-fns";
import constants from "../../constants/constants.js";
import type { ServiceFn } from "../../utils/services/types.js";
import services from "../index.js";
import Formatter from "../../libs/formatters/index.js";

/**
 * Resends an invitation email to a user who has not yet accepted their invitation.
 */
const resendInvitation: ServiceFn<
	[
		{
			userId: number;
		},
	],
	null
> = async (context, data) => {
	const Users = Repository.get("users", context.db, context.config.db);
	const UserTokens = Repository.get(
		"user-tokens",
		context.db,
		context.config.db,
	);

	const userRes = await Users.selectSingle({
		select: ["id", "email", "first_name", "last_name", "invitation_accepted"],
		where: [
			{
				key: "id",
				operator: "=",
				value: data.userId,
			},
		],
		validation: {
			enabled: true,
			defaultError: {
				message: T("user_not_found_message"),
				status: 404,
			},
		},
	});
	if (userRes.error) return userRes;

	if (Formatter.formatBoolean(userRes.data.invitation_accepted)) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: T("invitation_already_accepted_message"),
			},
			data: undefined,
		};
	}

	const deleteMultipleRes = await UserTokens.deleteMultiple({
		where: [
			{
				key: "user_id",
				operator: "=",
				value: data.userId,
			},
			{
				key: "token_type",
				operator: "=",
				value: constants.userTokens.invitation,
			},
		],
		validation: {
			enabled: true,
		},
	});
	if (deleteMultipleRes.error) return deleteMultipleRes;

	const expiryDate = add(new Date(), {
		minutes: constants.userInviteTokenExpirationMinutes,
	}).toISOString();

	const userTokenRes = await services.userTokens.createSingle(context, {
		userId: userRes.data.id,
		tokenType: constants.userTokens.invitation,
		expiryDate: expiryDate,
	});
	if (userTokenRes.error) return userTokenRes;

	const sendEmailRes = await services.emails.sendEmail(context, {
		type: "internal",
		to: userRes.data.email,
		subject: T("user_invite_email_subject"),
		template: constants.emailTemplates.userInvite,
		data: {
			firstName: userRes.data.first_name,
			lastName: userRes.data.last_name,
			email: userRes.data.email,
			resetLink: `${context.config.host}${constants.locations.acceptInvitation}?token=${userTokenRes.data.token}`,
		},
	});
	if (sendEmailRes.error) return sendEmailRes;

	return {
		error: undefined,
		data: null,
	};
};

export default resendInvitation;
