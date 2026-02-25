import { add } from "date-fns";
import constants from "../../constants/constants.js";
import {
	UserRolesRepository,
	UsersRepository,
} from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import generateSecret from "../../utils/helpers/generate-secret.js";
import { formatEmailSubject, getBaseUrl } from "../../utils/helpers/index.js";
import { normalizeEmailInput } from "../../utils/helpers/normalize-input.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { emailServices, userServices, userTokenServices } from "../index.js";

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
	const Users = new UsersRepository(context.db.client, context.config.db);
	const email = normalizeEmailInput(data.email);

	const [userExistsRes, roleExistsRes] = await Promise.all([
		Users.selectSingleByEmailUsername({
			select: ["id", "username", "email"],
			where: {
				username: data.username,
				email: email,
			},
		}),
		userServices.checks.checkRolesExist(context, {
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
					email:
						userExistsRes.data.email === email
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
			data: undefined,
		};
	}

	const { encryptSecret } = generateSecret(context.config.secrets.encryption);

	const newUserRes = await Users.createSingle({
		data: {
			email: email,
			username: data.username,
			first_name: data.firstName,
			last_name: data.lastName,
			super_admin: data.authSuperAdmin ? data.superAdmin : false,
			triggered_password_reset: false,
			secret: encryptSecret,
			invitation_accepted: false,
			is_locked: false,
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

	const userTokenRes = await userTokenServices.createSingle(context, {
		userId: newUserRes.data.id,
		tokenType: constants.userTokens.invitation,
		expiryDate: expiryDate,
	});
	if (userTokenRes.error) return userTokenRes;

	const baseUrl = getBaseUrl(context);

	const sendEmailRes = await emailServices.sendEmail(context, {
		type: "internal",
		to: email,
		subject: formatEmailSubject(
			T("user_invite_email_subject"),
			context.config.brand?.name,
		),
		template: constants.emailTemplates.userInvite,
		data: {
			firstName: data.firstName,
			lastName: data.lastName,
			email: email,
			inviteLink: `${baseUrl}${constants.locations.acceptInvitation}?token=${userTokenRes.data.token}`,
			logoUrl: `${baseUrl}${constants.assets.emailLogo}`,
			brand: {
				name: context.config.brand?.name,
			},
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

	const UserRoles = new UserRolesRepository(
		context.db.client,
		context.config.db,
	);

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
