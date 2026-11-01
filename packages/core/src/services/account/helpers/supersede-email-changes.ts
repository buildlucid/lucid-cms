import constants from "../../../constants/constants.js";
import type { EmailChangeRequestStatus } from "../../../libs/db/tables/email-change-requests.js";
import {
	EmailChangeRequestsRepository,
	UserTokensRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Supersedes matching email changes and revokes their links. With `afterId`, only later requests
 * are affected.
 */
const supersedeEmailChanges: ServiceFn<
	[
		{
			userId: number;
			statuses: EmailChangeRequestStatus[];
			afterId?: number;
		},
	],
	undefined
> = async (context, data) => {
	const EmailChangeRequests = new EmailChangeRequestsRepository(context.db);
	const UserTokens = new UserTokensRepository(context.db);
	const now = new Date().toISOString();

	const activeRes = await EmailChangeRequests.selectMultiple({
		select: ["id", "confirm_token_id", "revert_token_id"],
		where: [
			{ key: "user_id", operator: "=", value: data.userId },
			{ key: "status", operator: "in", value: data.statuses },
			{ key: "expires_at", operator: ">", value: now },
			{ key: "id", operator: ">", value: data.afterId ?? 0 },
		],
	});
	if (activeRes.error) return activeRes;

	const active = activeRes.data ?? [];
	if (active.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const [requestsRes, tokensRes] = await Promise.all([
		EmailChangeRequests.updateMultiple({
			data: {
				status: constants.emailChangeRequestStatuses.superseded,
				updated_at: now,
			},
			where: [
				{
					key: "id",
					operator: "in",
					value: active.map((request) => request.id),
				},
			],
		}),
		UserTokens.updateMultiple({
			data: {
				revoked_at: now,
				revoke_reason: constants.userTokenRevokeReasons.emailChangeSuperseded,
				expiry_date: now,
			},
			where: [
				{
					key: "id",
					operator: "in",
					value: active.flatMap((request) => [
						request.confirm_token_id,
						request.revert_token_id,
					]),
				},
				{ key: "revoked_at", operator: "is", value: null },
			],
		}),
	]);
	if (requestsRes.error) return requestsRes;
	if (tokensRes.error) return tokensRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default supersedeEmailChanges;
