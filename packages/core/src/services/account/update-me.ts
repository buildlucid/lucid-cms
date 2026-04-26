import constants from "../../constants/constants.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { LucidAuth } from "../../types/hono.js";
import { normalizeEmailInput } from "../../utils/helpers/normalize-input.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { accountServices, securityAuditServices } from "../index.js";

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

	const Users = new UsersRepository(context.db.client, context.config.db);
	const normalizedEmail =
		data.email !== undefined ? normalizeEmailInput(data.email) : undefined;

	const getUserRes = await Users.selectSingle({
		select: ["super_admin", "password", "first_name", "secret", "email"],
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

	const emailChanged =
		normalizedEmail !== undefined && normalizedEmail !== getUserRes.data.email;

	const [userWithUsername, updatePassword] = await Promise.all([
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
			encryptionKey: context.config.secrets.encryption,
		}),
	]);
	if (userWithUsername?.error) return userWithUsername;
	if (updatePassword.error) return updatePassword;

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

	const [updateMeRes, updatePasswordAuditRes] = await Promise.all([
		Users.updateSingle({
			data: {
				first_name: data.firstName,
				last_name: data.lastName,
				username: data.username,
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
		}),
		updatePassword.data.newPassword !== undefined
			? securityAuditServices.logSecurityAudit(context, {
					userId: data.auth.id,
					action: constants.securityAudit.actions.passwordChange,
					performedBy: data.auth.id,
					previousValue: constants.securityAudit.redactedValue,
					newValue: constants.securityAudit.redactedValue,
				})
			: undefined,
	]);
	if (updateMeRes.error) return updateMeRes;
	if (updatePasswordAuditRes?.error) return updatePasswordAuditRes;

	if (emailChanged) {
		const requestEmailChangeRes = await accountServices.requestEmailChange(
			context,
			{
				auth: data.auth,
				oldEmail: getUserRes.data.email,
				newEmail: normalizedEmail as string,
				firstName: updateMeRes.data.first_name,
				lastName: updateMeRes.data.last_name,
			},
		);
		if (requestEmailChangeRes.error) return requestEmailChangeRes;
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
