import { add } from "date-fns";
import constants from "../../constants/constants.js";
import {
	EmailChangeRequestsRepository,
	UsersRepository,
	UserTokensRepository,
} from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { LucidAuth } from "../../types/hono.js";
import { formatEmailSubject, getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { emailServices, userTokenServices } from "../index.js";

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
	const Users = new UsersRepository(context.db.client, context.config.db);
	const UserTokens = new UserTokensRepository(
		context.db.client,
		context.config.db,
	);
	const EmailChangeRequests = new EmailChangeRequestsRepository(
		context.db.client,
		context.config.db,
	);

	const now = new Date().toISOString();
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
						message: T("this_email_is_already_in_use"),
					},
				},
			},
			data: undefined,
		};
	}

	const [activePendingRes, activeConfirmedRes] = await Promise.all([
		EmailChangeRequests.selectMultiple({
			select: ["id", "confirm_token_id", "revert_token_id"],
			where: [
				{ key: "user_id", operator: "=", value: data.auth.id },
				{
					key: "status",
					operator: "=",
					value: constants.emailChangeRequestStatuses.pending,
				},
				{ key: "expires_at", operator: ">", value: now },
			],
		}),
		EmailChangeRequests.selectMultiple({
			select: ["id", "revert_token_id"],
			where: [
				{ key: "user_id", operator: "=", value: data.auth.id },
				{
					key: "status",
					operator: "=",
					value: constants.emailChangeRequestStatuses.confirmed,
				},
				{ key: "expires_at", operator: ">", value: now },
			],
		}),
	]);
	if (activePendingRes.error) return activePendingRes;
	if (activeConfirmedRes.error) return activeConfirmedRes;

	const activePending = activePendingRes.data ?? [];
	const activeConfirmed = activeConfirmedRes.data ?? [];
	const activeRequestIds = [
		...activePending.map((request) => request.id),
		...activeConfirmed.map((request) => request.id),
	];
	const activeTokenIds = [
		...activePending.flatMap((request) => [
			request.confirm_token_id,
			request.revert_token_id,
		]),
		...activeConfirmed.map((request) => request.revert_token_id),
	];

	if (activeRequestIds.length > 0) {
		const [supersedeRequestsRes, supersedeTokensRes] = await Promise.all([
			EmailChangeRequests.updateMultiple({
				data: {
					status: constants.emailChangeRequestStatuses.superseded,
					updated_at: now,
				},
				where: [{ key: "id", operator: "in", value: activeRequestIds }],
			}),
			activeTokenIds.length > 0
				? UserTokens.updateMultiple({
						data: {
							revoked_at: now,
							revoke_reason:
								constants.userTokenRevokeReasons.emailChangeSuperseded,
							expiry_date: now,
						},
						where: [{ key: "id", operator: "in", value: activeTokenIds }],
					})
				: undefined,
		]);
		if (supersedeRequestsRes.error) return supersedeRequestsRes;
		if (supersedeTokensRes?.error) return supersedeTokensRes;
	}

	const expiresAt = add(new Date(), {
		minutes: constants.emailChangeTokenExpirationMinutes,
	}).toISOString();
	const [confirmTokenRes, revertTokenRes] = await Promise.all([
		userTokenServices.createSingle(context, {
			userId: data.auth.id,
			tokenType: constants.userTokens.emailChangeConfirm,
			expiryDate: expiresAt,
		}),
		userTokenServices.createSingle(context, {
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

	const baseUrl = getBaseUrl(context);
	const commonData = {
		firstName: data.firstName,
		lastName: data.lastName,
		oldEmail: data.oldEmail,
		newEmail: data.newEmail,
		logoUrl: `${baseUrl}${constants.email.assets.logo}`,
		brand: {
			name: context.config.brand?.name,
		},
	};

	const confirmEmailRes = await emailServices.sendEmail(context, {
		type: "internal",
		to: data.newEmail,
		subject: formatEmailSubject(
			T("email_change_confirm_subject"),
			context.config.brand?.name,
		),
		template: constants.email.templates.emailChangeConfirm.key,
		data: {
			...commonData,
			confirmLink: `${baseUrl}${constants.email.locations.emailChangeConfirm}?token=${confirmTokenRes.data.token}`,
		},
		storage: constants.email.templates.emailChangeConfirm.storage,
	});
	if (confirmEmailRes.error) return confirmEmailRes;

	const revertEmailRes = await emailServices.sendEmail(context, {
		type: "internal",
		to: data.oldEmail,
		subject: formatEmailSubject(
			T("email_change_revert_subject"),
			context.config.brand?.name,
		),
		template: constants.email.templates.emailChangeRevert.key,
		data: {
			...commonData,
			revertLink: `${baseUrl}${constants.email.locations.emailChangeRevert}?token=${revertTokenRes.data.token}`,
		},
		storage: constants.email.templates.emailChangeRevert.storage,
	});
	if (revertEmailRes.error) return revertEmailRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default requestEmailChange;
