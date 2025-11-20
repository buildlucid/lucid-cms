import constants from "../../constants/constants.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { LucidAuth } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { accountServices, emailServices } from "../index.js";

const updateMe: ServiceFn<
	[
		{
			auth: LucidAuth;
			firstName?: string;
			lastName?: string;
			username?: string;
			email?: string;
			currentPassword?: string;
			newPassword?: string;
			passwordConfirmation?: string;
		},
	],
	undefined
> = async (context, data) => {
	if (data.newPassword && context.config.auth.password.enabled === false) {
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

	const getUserRes = await Users.selectSingle({
		select: ["super_admin", "password", "first_name", "secret"],
		where: [
			{
				key: "id",
				operator: "=",
				value: data.auth.id,
			},
		],
		validation: {
			enabled: true,
			defaultError: {
				message: T("account_not_found_message"),
				status: 404,
			},
		},
	});
	if (getUserRes.error) return getUserRes;

	const [userWithEmail, userWithUsername, updatePassword] = await Promise.all([
		data.email !== undefined
			? Users.selectSingle({
					select: ["id"],
					where: [
						{
							key: "email",
							operator: "=",
							value: data.email,
						},
						{
							key: "id",
							operator: "!=",
							value: data.auth.id,
						},
					],
				})
			: undefined,
		data.username !== undefined
			? Users.selectSingle({
					select: ["id"],
					where: [
						{
							key: "username",
							operator: "=",
							value: data.username,
						},
						{
							key: "id",
							operator: "!=",
							value: data.auth.id,
						},
					],
				})
			: undefined,
		accountServices.checks.checkUpdatePassword(context, {
			encryptedSecret: getUserRes.data.secret,
			password: getUserRes.data.password,
			currentPassword: data.currentPassword,
			newPassword: data.newPassword,
			passwordConfirmation: data.passwordConfirmation,
			encryptionKey: context.config.keys.encryptionKey,
		}),
	]);
	if (userWithEmail?.error) return userWithEmail;
	if (userWithUsername?.error) return userWithUsername;
	if (updatePassword.error) return updatePassword;

	if (data.email !== undefined && userWithEmail?.data !== undefined) {
		return {
			error: {
				type: "basic",
				status: 400,
				errors: {
					email: {
						code: "invalid",
						message: T("this_email_is_already_in_use"),
					},
				},
			},
			data: undefined,
		};
	}
	if (data.username !== undefined && userWithUsername?.data !== undefined) {
		return {
			error: {
				type: "basic",
				status: 400,
				errors: {
					username: {
						code: "invalid",
						message: T("this_username_is_already_in_use"),
					},
				},
			},
			data: undefined,
		};
	}

	const updateMeRes = await Users.updateSingle({
		data: {
			first_name: data.firstName,
			last_name: data.lastName,
			username: data.username,
			email: data.email,
			updated_at: new Date().toISOString(),
			password: updatePassword.data.newPassword,
			secret: updatePassword.data.encryptSecret,
			triggered_password_reset: updatePassword.data.triggerPasswordReset,
		},
		where: [
			{
				key: "id",
				operator: "=",
				value: data.auth.id,
			},
		],
		returning: ["id", "first_name", "last_name", "email"],
		validation: {
			enabled: true,
			defaultError: {
				message: T("route_user_me_update_error_message"),
				status: 400,
			},
		},
	});
	if (updateMeRes.error) return updateMeRes;

	if (data.email !== undefined) {
		const sendEmail = await emailServices.sendEmail(context, {
			template: constants.emailTemplates.emailChanged,
			type: "internal",
			to: data.email,
			subject: T("email_update_success_subject"),
			data: {
				firstName: data.firstName || getUserRes.data.first_name,
			},
		});
		if (sendEmail.error) return sendEmail;
	}

	if (getUserRes.data.super_admin === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	// super admin specific

	return {
		error: undefined,
		data: undefined,
	};
};

export default updateMe;
