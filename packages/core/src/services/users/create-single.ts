import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import { add } from "date-fns";
import constants from "../../constants/constants.js";
import generateSecret from "../../utils/helpers/generate-secret.js";
import type { ServiceFn } from "../../utils/services/types.js";

const createSingle: ServiceFn<
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
	const UsersRepo = Repository.get("users", context.db, context.config.db);

	const [userExists, roleExistsRes] = await Promise.all([
		UsersRepo.selectSingleByEmailUsername({
			select: ["id", "username", "email"],
			data: {
				username: data.username,
				email: data.email,
			},
		}),
		context.services.user.checks.checkRolesExist(context, {
			roleIds: data.roleIds,
		}),
	]);
	if (roleExistsRes.error) return roleExistsRes;

	if (userExists !== undefined) {
		return {
			error: {
				type: "basic",
				status: 500,
				errorResponse: {
					body: {
						email:
							userExists.email === data.email
								? {
										code: "invalid",
										message: T("duplicate_entry_error_message"),
									}
								: undefined,
						username:
							userExists.username === data.username
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

	const newUser = await UsersRepo.createSingle({
		email: data.email,
		username: data.username,
		firstName: data.firstName,
		lastName: data.lastName,
		superAdmin: data.authSuperAdmin ? data.superAdmin : false,
		triggerPasswordReset: false,
		secret: encryptSecret,
	});

	if (newUser === undefined) {
		return {
			error: {
				type: "basic",
				status: 500,
			},
			data: undefined,
		};
	}

	// Email Invite
	const expiryDate = add(new Date(), {
		minutes: constants.userInviteTokenExpirationMinutes,
	}).toISOString();

	const userTokenRes = await context.services.user.token.createSingle(context, {
		userId: newUser.id,
		tokenType: "password_reset",
		expiryDate: expiryDate,
	});
	if (userTokenRes.error) return userTokenRes;

	const sendEmailRes = await context.services.email.sendEmail(context, {
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
			data: newUser.id,
		};
	}

	const UserRolesRepo = Repository.get(
		"user-roles",
		context.db,
		context.config.db,
	);

	await UserRolesRepo.createMultiple({
		items: data.roleIds.map((r) => ({
			userId: newUser.id,
			roleId: r,
		})),
	});

	return {
		error: undefined,
		data: newUser.id,
	};
};

export default createSingle;
