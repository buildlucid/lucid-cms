import { add } from "date-fns";
import constants from "../../constants/constants.js";
import { copy } from "../../libs/i18n/index.js";
import {
	EmailChangeRequestsRepository,
	UserRolesRepository,
	UsersRepository,
} from "../../libs/repositories/index.js";
import generateSecret from "../../utils/helpers/generate-secret.js";
import { formatEmailSubject } from "../../utils/helpers/index.js";
import { normalizeEmailInput } from "../../utils/helpers/normalize-input.js";
import type { ServiceFn } from "../../utils/services/types.js";
import sendEmail from "../email/send-email.js";
import createUserToken from "../user-tokens/create-single.js";
import checkRolesExist from "./checks/check-roles-exist.js";

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
	const Users = new UsersRepository(context.db);
	const EmailChangeRequests = new EmailChangeRequestsRepository(context.db);
	const email = normalizeEmailInput(data.email);

	const [userExistsRes, reservedEmailRes, roleExistsRes] = await Promise.all([
		Users.selectSingleByEmailUsername({
			select: ["id", "username", "email"],
			where: {
				username: data.username,
				email: email,
			},
		}),
		EmailChangeRequests.selectReservedByEmail({
			email,
		}),
		checkRolesExist(context, {
			roleIds: data.roleIds,
		}),
	]);
	if (userExistsRes.error) return userExistsRes;
	if (reservedEmailRes.error) return reservedEmailRes;
	if (roleExistsRes.error) return roleExistsRes;

	if (userExistsRes.data !== undefined || reservedEmailRes.data !== undefined) {
		return {
			error: {
				type: "basic",
				status: 500,
				errors: {
					email:
						userExistsRes.data?.email === email ||
						reservedEmailRes.data !== undefined
							? {
									code: "invalid",
									message: copy("server:core.database.duplicates.entry"),
								}
							: undefined,
					username:
						userExistsRes.data?.username === data.username
							? {
									code: "invalid",
									message: copy("server:core.database.duplicates.entry"),
								}
							: undefined,
				},
			},
			data: undefined,
		};
	}

	const targetSuperAdmin = data.authSuperAdmin && data.superAdmin === true;

	const { encryptSecret } = generateSecret(context.config.secrets.encryption);

	const newUserRes = await Users.createSingle({
		data: {
			email: email,
			username: data.username,
			first_name: data.firstName,
			last_name: data.lastName,
			super_admin: targetSuperAdmin,
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

	const userTokenRes = await createUserToken(context, {
		userId: newUserRes.data.id,
		tokenType: constants.userTokens.invitation,
		expiryDate: expiryDate,
	});
	if (userTokenRes.error) return userTokenRes;

	const sendEmailRes = await sendEmail(context, {
		type: "internal",
		to: email,
		subject: (emailData) =>
			formatEmailSubject(
				context.translate("server:core.email.invitations.email.subject"),
				emailData.context.brand.name,
			),
		template: constants.email.templates.userInvite.key,
		data: {
			firstName: data.firstName,
			lastName: data.lastName,
			email: email,
			inviteLink: `${constants.email.locations.acceptInvitation}?token=${userTokenRes.data.token}`,
		},
		storage: constants.email.templates.userInvite.storage,
	});
	if (sendEmailRes.error) return sendEmailRes;

	// Roles
	if (data.roleIds === undefined || data.roleIds.length === 0) {
		return {
			error: undefined,
			data: newUserRes.data.id,
		};
	}

	const UserRoles = new UserRolesRepository(context.db);

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
