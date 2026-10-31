import constants from "../../../constants/constants.js";
import { copy } from "../../../libs/i18n/index.js";
import {
	UsersRepository,
	UserTokensRepository,
} from "../../../libs/repositories/index.js";
import type { TwoFactorProof } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import withTransaction from "../../../utils/services/with-transaction.js";
import checkProof from "./check-proof.js";

/**
 * Run without an outer transaction so failed attempts stay counted. Challenge and code consumption
 * share a transaction; successful or unchecked attempts are refunded.
 */
const verifyChallenge: ServiceFn<
	[
		{
			challengeId: number;
			userId: number;
			proof: TwoFactorProof;
		},
	],
	undefined
> = async (context, data) => {
	const Users = new UsersRepository(context.db);
	const UserTokens = new UserTokensRepository(context.db);

	const reserveRes = await Users.reserveTwoFactorAttempt({
		id: data.userId,
		limit: constants.twoFactor.hourlyAttemptLimit,
		windowMs: 3_600_000,
	});
	if (reserveRes.error) return reserveRes;
	if (!reserveRes.data) {
		return {
			error: {
				type: "rate_limit",
				code: "rate_limit",
				status: 429,
				message: copy("server:core.auth.two.factor.hourly.limit.message"),
			},
			data: undefined,
		};
	}

	const attemptRes = await UserTokens.incrementCodeAttempts({
		id: data.challengeId,
		maxAttempts: constants.twoFactor.maxChallengeAttempts,
	});
	if (attemptRes.error) return attemptRes;
	if (!attemptRes.data) {
		//* the code was never checked, so it shouldn't count against the account
		const refundRes = await Users.refundTwoFactorAttempt({
			id: data.userId,
			resetAt: reserveRes.data.resetAt,
		});
		if (refundRes.error) return refundRes;

		return {
			error: {
				type: "authorisation",
				code: "two_factor_expired",
				status: 401,
				message: copy("server:core.auth.two.factor.challenge.attempts.message"),
			},
			data: undefined,
		};
	}

	//* the challenge and the code are used up together, so a code isn't lost when the challenge can't be
	let proofChecked = false;
	const passRes = await withTransaction(context, async (context) => {
		const UserTokens = new UserTokensRepository(context.db);

		const consumeRes = await UserTokens.consumeTwoFactorChallenge({
			id: data.challengeId,
		});
		if (consumeRes.error) return consumeRes;
		if (!consumeRes.data) {
			return {
				error: {
					type: "authorisation",
					code: "two_factor_expired",
					status: 401,
					message: copy(
						"server:core.auth.two.factor.challenge.expired.message",
					),
				},
				data: undefined,
			};
		}

		proofChecked = true;
		return checkProof(context, {
			userId: data.userId,
			proof: data.proof,
		});
	});

	//* only wrong codes count, so right ones and ones never checked are handed back
	if (!passRes.error || !proofChecked) {
		const refundRes = await Users.refundTwoFactorAttempt({
			id: data.userId,
			resetAt: reserveRes.data.resetAt,
		});
		if (refundRes.error) return refundRes;
	}
	if (passRes.error) return passRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default verifyChallenge;
