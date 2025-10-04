import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import { add } from "date-fns";
import constants from "../../constants/constants.js";
import generateSecret from "../../utils/helpers/generate-secret.js";
import type { ServiceFn } from "../../utils/services/types.js";
import services from "../index.js";

const inviteSingle: ServiceFn<
	[
		{
			email: string;
			username: string;
			firstName?: string;
			lastName?: string;
			superAdmin?: boolean;
			roleIds: Array<number>;
			authSuperAdmin: boolean;
		},
	],
	number
> = async (context, data) => {
	const Users = Repository.get("users", context.db, context.config.db);

	const [userExistsRes, roleExistsRes] = await Promise.all([
		Users.selectSingleByEmailUsername({
			select: ["id", "username", "email"],
			where: {
				username: data.username,
				email: data.email,
			},
		}),
		services.users.checks.checkRolesExist(context, {
			roleIds: data.roleIds,
		}),
	]);
	if (userExistsRes.error) return userExistsRes;
	if (roleExistsRes.error) return roleExistsRes;

	if (userExistsRes.data !== undefined) {
		return {
			error: {
				type: "basic",
				status: 500,
				errors: {
					body: {
						email:
							userExistsRes.data.email === data.email
								? {
										code: "invalid",
										message: T("duplicate_entry_error_message"),
									}
								: undefined,
						username:
							userExistsRes.data.username === data.username
								? {
										code: "invalid",
										message: T("duplicate_entry_error_message"),
									}
								: undefined,
					},
				},
			},
			data: undefined,
		};
	}

	const { encryptSecret } = generateSecret(context.config.keys.encryptionKey);

	const newUserRes = await Users.createSingle({
		data: {
			email: data.email,
			username: data.username,
			first_name: data.firstName,
			last_name: data.lastName,
			super_admin: data.authSuperAdmin ? data.superAdmin : false,
			triggered_password_reset: false,
			secret: encryptSecret,
		},
		returning: ["id"],
		validation: {
			enabled: true,
			defaultError: {
				status: 500,
			},
		},
	});
	if (newUserRes.error) return newUserRes;

	// Email Invite
	const expiryDate = add(new Date(), {
		minutes: constants.userInviteTokenExpirationMinutes,
	}).toISOString();

	const userTokenRes = await services.userTokens.createSingle(context, {
		userId: newUserRes.data.id,
		tokenType: "password_reset",
		expiryDate: expiryDate,
	});
	if (userTokenRes.error) return userTokenRes;

	const sendEmailRes = await services.emails.sendEmail(context, {
		type: "internal",
		to: data.email,
		subject: T("user_invite_email_subject"),
		template: constants.emailTemplates.userInvite,
		data: {
			firstName: data.firstName,
			lastName: data.lastName,
			email: data.email,
			resetLink: `${context.config.host}${constants.locations.resetPassword}?token=${userTokenRes.data.token}`,
		},
	});
	if (sendEmailRes.error) return sendEmailRes;

	// Roles
	if (data.roleIds === undefined || data.roleIds.length === 0) {
		return {
			error: undefined,
			data: newUserRes.data.id,
		};
	}

	const UserRoles = Repository.get("user-roles", context.db, context.config.db);

	const createMultipleRes = await UserRoles.createMultiple({
		data: data.roleIds.map((r) => ({
			user_id: newUserRes.data.id,
			role_id: r,
		})),
	});
	if (createMultipleRes.error) return createMultipleRes;

	return {
		error: undefined,
		data: newUserRes.data.id,
	};
};

export default inviteSingle;
