import constants from "../../constants/constants.js";
import {
	EmailChangeRequestsRepository,
	UsersRepository,
	UserTokensRepository,
} from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import {
	authServices,
	securityAuditServices,
	userTokenServices,
} from "../index.js";

const revertEmailChange: ServiceFn<
	[
		{
			token: string;
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

	const tokenRes = await userTokenServices.getSingle(context, {
		token: data.token,
		tokenType: constants.userTokens.emailChangeRevert,
	});
	if (tokenRes.error) return tokenRes;

	const requestRes = await EmailChangeRequests.selectByRevertTokenId({
		tokenId: tokenRes.data.id,
		validation: {
			enabled: true,
			defaultError: {
				type: "basic",
				status: 404,
				message: T("token_not_found_message"),
			},
		},
	});
	if (requestRes.error) return requestRes;

	const canRevert =
		requestRes.data.status === constants.emailChangeRequestStatuses.pending ||
		requestRes.data.status === constants.emailChangeRequestStatuses.confirmed;
	if (!canRevert || requestRes.data.user_id !== tokenRes.data.user_id) {
		return {
			error: {
				type: "basic",
				status: 404,
				message: T("token_not_found_message"),
			},
			data: undefined,
		};
	}

	const now = new Date().toISOString();

	if (requestRes.data.status === constants.emailChangeRequestStatuses.pending) {
		const updateRequestRes = await EmailChangeRequests.updateSingle({
			data: {
				status: constants.emailChangeRequestStatuses.cancelled,
				cancelled_at: now,
				updated_at: now,
			},
			where: [
				{ key: "id", operator: "=", value: requestRes.data.id },
				{
					key: "status",
					operator: "=",
					value: constants.emailChangeRequestStatuses.pending,
				},
				{ key: "expires_at", operator: ">", value: now },
			],
			returning: ["id"],
			validation: {
				enabled: true,
				defaultError: {
					type: "basic",
					status: 404,
					message: T("token_not_found_message"),
				},
			},
		});
		if (updateRequestRes.error) return updateRequestRes;

		const [consumeRevertTokenRes, revokeConfirmTokenRes] = await Promise.all([
			UserTokens.updateSingle({
				data: {
					consumed_at: now,
					revoked_at: now,
					revoke_reason: constants.userTokenRevokeReasons.emailChangeCancelled,
					expiry_date: now,
				},
				where: [
					{ key: "id", operator: "=", value: requestRes.data.revert_token_id },
					{
						key: "token_type",
						operator: "=",
						value: constants.userTokens.emailChangeRevert,
					},
					{ key: "revoked_at", operator: "is", value: null },
					{ key: "consumed_at", operator: "is", value: null },
				],
				returning: ["id"],
				validation: {
					enabled: true,
					defaultError: {
						type: "basic",
						status: 404,
						message: T("token_not_found_message"),
					},
				},
			}),
			UserTokens.updateSingle({
				data: {
					revoked_at: now,
					revoke_reason: constants.userTokenRevokeReasons.emailChangeCancelled,
					expiry_date: now,
				},
				where: [
					{ key: "id", operator: "=", value: requestRes.data.confirm_token_id },
					{
						key: "token_type",
						operator: "=",
						value: constants.userTokens.emailChangeConfirm,
					},
				],
				returning: ["id"],
			}),
		]);
		if (consumeRevertTokenRes.error) return consumeRevertTokenRes;
		if (revokeConfirmTokenRes.error) return revokeConfirmTokenRes;

		return {
			error: undefined,
			data: undefined,
		};
	}

	const userRes = await Users.selectSingle({
		select: ["id", "email"],
		where: [{ key: "id", operator: "=", value: requestRes.data.user_id }],
		validation: {
			enabled: true,
			defaultError: {
				status: 404,
				message: T("user_not_found_message"),
			},
		},
	});
	if (userRes.error) return userRes;

	if (userRes.data.email !== requestRes.data.new_email) {
		return {
			error: {
				type: "basic",
				status: 409,
				message: T("email_change_request_stale_message"),
			},
			data: undefined,
		};
	}

	const [userWithOldEmailRes, reservedOldEmailRes] = await Promise.all([
		Users.selectSingle({
			select: ["id"],
			where: [
				{ key: "email", operator: "=", value: requestRes.data.old_email },
				{ key: "id", operator: "!=", value: requestRes.data.user_id },
			],
		}),
		EmailChangeRequests.selectReservedByEmail({
			email: requestRes.data.old_email,
			excludeUserId: requestRes.data.user_id,
		}),
	]);
	if (userWithOldEmailRes.error) return userWithOldEmailRes;
	if (reservedOldEmailRes.error) return reservedOldEmailRes;
	if (
		userWithOldEmailRes.data !== undefined ||
		reservedOldEmailRes.data !== undefined
	) {
		return {
			error: {
				type: "basic",
				status: 409,
				message: T("email_change_email_unavailable_message"),
			},
			data: undefined,
		};
	}

	const updateRequestRes = await EmailChangeRequests.updateSingle({
		data: {
			status: constants.emailChangeRequestStatuses.reverted,
			reverted_at: now,
			updated_at: now,
		},
		where: [
			{ key: "id", operator: "=", value: requestRes.data.id },
			{
				key: "status",
				operator: "=",
				value: constants.emailChangeRequestStatuses.confirmed,
			},
			{ key: "expires_at", operator: ">", value: now },
		],
		returning: ["id"],
		validation: {
			enabled: true,
			defaultError: {
				type: "basic",
				status: 404,
				message: T("token_not_found_message"),
			},
		},
	});
	if (updateRequestRes.error) return updateRequestRes;

	const [updateUserRes, consumeTokenRes, auditRes, revokeRefreshTokensRes] =
		await Promise.all([
			Users.updateSingle({
				data: {
					email: requestRes.data.old_email,
					updated_at: now,
				},
				where: [{ key: "id", operator: "=", value: requestRes.data.user_id }],
				returning: ["id"],
				validation: {
					enabled: true,
					defaultError: {
						status: 400,
					},
				},
			}),
			UserTokens.updateSingle({
				data: {
					consumed_at: now,
					revoked_at: now,
					revoke_reason: constants.userTokenRevokeReasons.emailChangeReverted,
					expiry_date: now,
				},
				where: [
					{ key: "id", operator: "=", value: requestRes.data.revert_token_id },
					{
						key: "token_type",
						operator: "=",
						value: constants.userTokens.emailChangeRevert,
					},
					{ key: "revoked_at", operator: "is", value: null },
					{ key: "consumed_at", operator: "is", value: null },
				],
				returning: ["id"],
				validation: {
					enabled: true,
					defaultError: {
						type: "basic",
						status: 404,
						message: T("token_not_found_message"),
					},
				},
			}),
			securityAuditServices.logSecurityAudit(context, {
				userId: requestRes.data.user_id,
				action: constants.securityAudit.actions.emailChange,
				performedBy: requestRes.data.user_id,
				previousValue: requestRes.data.new_email,
				newValue: requestRes.data.old_email,
			}),
			authServices.refreshToken.revokeUserTokens(context, {
				userId: requestRes.data.user_id,
				revokeReason: constants.refreshTokenRevokeReasons.emailChangeReverted,
			}),
		]);
	if (updateUserRes.error) return updateUserRes;
	if (consumeTokenRes.error) return consumeTokenRes;
	if (auditRes.error) return auditRes;
	if (revokeRefreshTokensRes.error) return revokeRefreshTokensRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default revertEmailChange;
