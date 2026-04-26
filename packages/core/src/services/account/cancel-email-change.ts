import constants from "../../constants/constants.js";
import {
	EmailChangeRequestsRepository,
	UserTokensRepository,
} from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const cancelEmailChange: ServiceFn<
	[
		{
			userId: number;
		},
	],
	undefined
> = async (context, data) => {
	const UserTokens = new UserTokensRepository(
		context.db.client,
		context.config.db,
	);
	const EmailChangeRequests = new EmailChangeRequestsRepository(
		context.db.client,
		context.config.db,
	);

	const requestRes = await EmailChangeRequests.selectActivePendingForUser({
		userId: data.userId,
		validation: {
			enabled: true,
			defaultError: {
				status: 404,
				message: T("pending_email_change_not_found_message"),
			},
		},
	});
	if (requestRes.error) return requestRes;

	const now = new Date().toISOString();
	const [updateRequestRes, revokeTokensRes] = await Promise.all([
		EmailChangeRequests.updateSingle({
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
			],
			returning: ["id"],
			validation: {
				enabled: true,
				defaultError: {
					status: 404,
					message: T("pending_email_change_not_found_message"),
				},
			},
		}),
		UserTokens.updateMultiple({
			data: {
				revoked_at: now,
				revoke_reason: constants.userTokenRevokeReasons.emailChangeCancelled,
				expiry_date: now,
			},
			where: [
				{
					key: "id",
					operator: "in",
					value: [
						requestRes.data.confirm_token_id,
						requestRes.data.revert_token_id,
					],
				},
			],
		}),
	]);
	if (updateRequestRes.error) return updateRequestRes;
	if (revokeTokensRes.error) return revokeTokensRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default cancelEmailChange;
