import crypto from "node:crypto";
import constants from "../../constants/constants.js";
import { copy } from "../../libs/i18n/index.js";
import { PasswordAttemptsRepository } from "../../libs/repositories/index.js";
import hashSecret from "../../utils/helpers/hash-secret.js";
import verifySecret from "../../utils/helpers/verify-secret.js";
import type { ServiceFn } from "../../utils/services/types.js";

/**
 * Checks passwords with account or unknown-identifier limits and a shared address limit. Refunds
 * successful attempts. Run outside transactions so failures stay counted.
 */
const verifyPassword: ServiceFn<
	[
		{
			/**
			 * The matched account, or the email or username typed when none matched. Leave it out for
			 * passwords that aren't an account's, such as a share link's.
			 */
			account?: { userId: number } | { identifier: string };
			/** Where an anonymous attempt came from. Signed-in checks leave it out, as the account limit covers them. */
			address?: string | null;
			password: string;
			/** The stored hash and the salt it was made with, or null when there's no password to check. */
			stored: { hash: string; salt: string } | null;
		},
	],
	boolean
> = async (context, data) => {
	const PasswordAttempts = new PasswordAttemptsRepository(context.db);
	const attemptKey = (name: string) =>
		crypto
			.createHmac("sha256", context.config.secrets.encryption)
			.update("lucid-password-attempts\0", "utf8")
			.update(name, "utf8")
			.digest("hex");

	const limits = [
		...(data.address
			? [
					{
						key: attemptKey(`address:${data.address}`),
						limit: constants.password.addressAttemptLimit,
					},
				]
			: []),
		...(data.account
			? [
					{
						key: attemptKey(
							"userId" in data.account
								? `user:${data.account.userId}`
								: `name:${data.account.identifier.trim().toLowerCase()}`,
						),
						limit: constants.password.attemptLimit,
					},
				]
			: []),
	];

	const reserved: Array<{ key: string; resetAt: string | Date }> = [];
	const refundAll = async () => {
		for (const attempt of reserved) {
			const refundRes = await PasswordAttempts.refund(attempt);
			if (refundRes.error) return refundRes;
		}
		return { error: undefined, data: undefined };
	};

	for (const { key, limit } of limits) {
		const reserveRes = await PasswordAttempts.reserve({
			key,
			limit,
			windowMs: constants.password.attemptWindowMs,
		});
		if (reserveRes.error) return reserveRes;
		if (!reserveRes.data) {
			//* the password was never checked, so it doesn't count against the limits that let it through
			const refundRes = await refundAll();
			if (refundRes.error) return refundRes;

			return {
				error: {
					type: "rate_limit",
					code: "rate_limit",
					status: 429,
					message: copy("server:core.auth.password.attempts.limit.message"),
				},
				data: undefined,
			};
		}
		reserved.push({ key, resetAt: reserveRes.data.resetAt });
	}

	if (!data.stored) {
		//* hash anyway, so accounts without a password take as long to answer
		await hashSecret(data.password, "lucid-login");
		return { error: undefined, data: false };
	}

	const valid = await verifySecret(
		data.password,
		data.stored.salt,
		data.stored.hash,
	);
	if (valid) {
		const refundRes = await refundAll();
		if (refundRes.error) return refundRes;
	}

	return { error: undefined, data: valid };
};

export default verifyPassword;
