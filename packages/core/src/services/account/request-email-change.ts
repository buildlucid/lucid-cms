import constants from "../../constants/constants.js";
import type { BuiltInEmailTemplates } from "../../libs/email/types.js";
import { copy } from "../../libs/i18n/index.js";
import {
	EmailChangeRequestsRepository,
	UsersRepository,
} from "../../libs/repositories/index.js";
import type { LucidAuth } from "../../types/hono.js";
import { formatEmailSubject } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import sendEmail from "../email/send-email.js";
import createUserToken from "../user-tokens/create-single.js";
import supersedeEmailChanges from "./helpers/supersede-email-changes.js";

const requestEmailChange: ServiceFn<
	[
		{
			auth: LucidAuth;
			oldEmail: string;
			newEmail: string;
			firstName?: string | null;
			lastName?: string | null;
		},
	],
	undefined
> = async (context, data) => {
	const Users = new UsersRepository(context.db);
	const EmailChangeRequests = new EmailChangeRequestsRepository(context.db);

	const [userWithEmailRes, reservedEmailRes] = await Promise.all([
		Users.selectSingle({
			select: ["id"],
			where: [
				{ key: "email", operator: "=", value: data.newEmail },
				{ key: "id", operator: "!=", value: data.auth.id },
			],
		}),
		EmailChangeRequests.selectReservedByEmail({
			email: data.newEmail,
			excludeUserId: data.auth.id,
		}),
	]);
	if (userWithEmailRes.error) return userWithEmailRes;
	if (reservedEmailRes.error) return reservedEmailRes;
	if (
		userWithEmailRes.data !== undefined ||
		reservedEmailRes.data !== undefined
	) {
		return {
			error: {
				type: "basic",
				status: 400,
				errors: {
					email: {
						code: "invalid",
						message: copy("server:core.users.email.duplicate"),
					},
				},
			},
			data: undefined,
		};
	}

	//* Preserve undo links for confirmed email changes.
	const supersedeRes = await supersedeEmailChanges(context, {
		userId: data.auth.id,
		statuses: [constants.emailChangeRequestStatuses.pending],
	});
	if (supersedeRes.error) return supersedeRes;

	const expiresAt = new Date(
		Date.now() + constants.emailChangeTokenExpirationMinutes * 60_000,
	).toISOString();
	const [confirmTokenRes, revertTokenRes] = await Promise.all([
		createUserToken(context, {
			userId: data.auth.id,
			tokenType: constants.userTokens.emailChangeConfirm,
			expiryDate: expiresAt,
		}),
		createUserToken(context, {
			userId: data.auth.id,
			tokenType: constants.userTokens.emailChangeRevert,
			expiryDate: expiresAt,
		}),
	]);
	if (confirmTokenRes.error) return confirmTokenRes;
	if (revertTokenRes.error) return revertTokenRes;

	const createRequestRes = await EmailChangeRequests.createSingle({
		data: {
			user_id: data.auth.id,
			old_email: data.oldEmail,
			new_email: data.newEmail,
			confirm_token_id: confirmTokenRes.data.tokenId,
			revert_token_id: revertTokenRes.data.tokenId,
			status: constants.emailChangeRequestStatuses.pending,
			expires_at: expiresAt,
		},
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (createRequestRes.error) return createRequestRes;

	const commonData = {
		firstName: data.firstName,
		lastName: data.lastName,
		oldEmail: data.oldEmail,
		newEmail: data.newEmail,
	};

	const confirmEmailRes = await sendEmail(context, {
		type: "internal",
		to: data.newEmail,
		subject: (emailData) =>
			formatEmailSubject(
				context.translate("server:core.email.change.confirm.subject"),
				emailData.context.brand.name,
			),
		template: constants.email.templates.emailChangeConfirm.key,
		data: {
			...commonData,
			confirmLink: `${constants.email.locations.emailChangeConfirm}?token=${confirmTokenRes.data.token}`,
		} satisfies BuiltInEmailTemplates["email-change-confirm"],
		storage: constants.email.templates.emailChangeConfirm.storage,
	});
	if (confirmEmailRes.error) return confirmEmailRes;

	const revertEmailRes = await sendEmail(context, {
		type: "internal",
		to: data.oldEmail,
		subject: (emailData) =>
			formatEmailSubject(
				context.translate("server:core.email.change.revert.subject"),
				emailData.context.brand.name,
			),
		template: constants.email.templates.emailChangeRevert.key,
		data: {
			...commonData,
			revertLink: `${constants.email.locations.emailChangeRevert}?token=${revertTokenRes.data.token}`,
		} satisfies BuiltInEmailTemplates["email-change-revert"],
		storage: constants.email.templates.emailChangeRevert.storage,
	});
	if (revertEmailRes.error) return revertEmailRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default requestEmailChange;
