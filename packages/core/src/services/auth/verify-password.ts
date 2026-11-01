import crypto from "node:crypto";
import constants from "../../constants/constants.js";
import { copy } from "../../libs/i18n/index.js";
import { PasswordAttemptsRepository } from "../../libs/repositories/index.js";
import { decrypt } from "../../utils/helpers/encrypt-decrypt.js";
import hashSecret from "../../utils/helpers/hash-secret.js";
import verifySecret from "../../utils/helpers/verify-secret.js";
import type { ServiceFn } from "../../utils/services/types.js";

/**
 * Counts wrong passwords per account, or entered identifier for unknown accounts. Refunds
 * successful attempts. Run outside a transaction so failures stay counted.
 */
const verifyPassword: ServiceFn<
	[
		{
			/** The matched account, or the email or username typed when none matched. */
			account: { userId: number } | { identifier: string };
			password: string;
			/** The account's password hash and encrypted secret, or null when it has no password. */
			stored: { password: string; secret: string } | null;
		},
	],
	boolean
> = async (context, data) => {
	const PasswordAttempts = new PasswordAttemptsRepository(context.db);
	const key = crypto
		.createHmac("sha256", context.config.secrets.encryption)
		.update("lucid-password-attempts\0", "utf8")
		.update(
			"userId" in data.account
				? `user:${data.account.userId}`
				: `name:${data.account.identifier.trim().toLowerCase()}`,
			"utf8",
		)
		.digest("hex");

	const reserveRes = await PasswordAttempts.reserve({
		key,
		limit: constants.password.attemptLimit,
		windowMs: constants.password.attemptWindowMs,
	});
	if (reserveRes.error) return reserveRes;
	if (!reserveRes.data) {
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

	if (!data.stored) {
		//* hash anyway, so accounts without a password take as long to answer
		await hashSecret(data.password, "lucid-login");
		return { error: undefined, data: false };
	}

	const valid = await verifySecret(
		data.password,
		decrypt(data.stored.secret, context.config.secrets.encryption),
		data.stored.password,
	);
	if (valid) {
		const refundRes = await PasswordAttempts.refund({
			key,
			resetAt: reserveRes.data.resetAt,
		});
		if (refundRes.error) return refundRes;
	}

	return { error: undefined, data: valid };
};

export default verifyPassword;
