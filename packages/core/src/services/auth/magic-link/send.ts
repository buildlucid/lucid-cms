import constants from "../../../constants/constants.js";
import type { BuiltInEmailTemplates } from "../../../libs/email/types.js";
import formatter from "../../../libs/formatters/index.js";
import { copy } from "../../../libs/i18n/index.js";
import {
	UsersRepository,
	UserTokensRepository,
} from "../../../libs/repositories/index.js";
import { formatEmailSubject } from "../../../utils/helpers/index.js";
import { normalizeEmailInput } from "../../../utils/helpers/normalize-input.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import sendEmail from "../../email/send-email.js";
import createUserToken from "../../user-tokens/create-single.js";
import { generateMagicLinkCode, hashMagicLinkCode } from "./helpers/code.js";

/**
 * Emails a login link and code to an active account, replacing any it was sent before.
 *
 * Unknown, locked and unaccepted accounts, and repeat requests inside the resend
 * window or over the hourly limit, send nothing but get the same response, so
 * the form never reveals who has an account.
 */
const send: ServiceFn<
	[
		{
			email: string;
			redirectPath?: string;
		},
	],
	undefined
> = async (context, data) => {
	if (context.config.auth.magicLink.enabled === false) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.auth.magic.link.disabled.message"),
			},
			data: undefined,
		};
	}

	const Users = new UsersRepository(context.db);
	const UserTokens = new UserTokensRepository(context.db);
	const email = normalizeEmailInput(data.email);

	const userRes = await Users.selectSingle({
		select: [
			"id",
			"first_name",
			"email",
			"is_deleted",
			"is_locked",
			"invitation_accepted",
		],
		where: [
			{
				key: "email",
				operator: "=",
				value: email,
			},
		],
	});
	if (userRes.error) return userRes;
	if (
		userRes.data === undefined ||
		formatter.formatBoolean(userRes.data.is_deleted) ||
		formatter.formatBoolean(userRes.data.is_locked) ||
		!formatter.formatBoolean(userRes.data.invitation_accepted)
	) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const recentRes = await UserTokens.selectMultiple({
		select: ["created_at"],
		where: [
			{
				key: "user_id",
				operator: "=",
				value: userRes.data.id,
			},
			{
				key: "token_type",
				operator: "=",
				value: constants.userTokens.magicLink,
			},
		],
		orderBy: [{ column: "created_at", direction: "desc" }],
		limit: constants.magicLink.hourlyLimit,
		validation: { enabled: true },
	});
	if (recentRes.error) return recentRes;

	const now = Date.now();
	const sentAgo = recentRes.data.map(
		(token) => now - Date.parse(formatter.formatDate(token.created_at) ?? ""),
	);
	const inCooldown = sentAgo.some(
		(ms) => ms < constants.magicLink.resendCooldownSeconds * 1000,
	);
	const overHourlyLimit =
		sentAgo.filter((ms) => ms < 3_600_000).length >=
		constants.magicLink.hourlyLimit;
	if (inCooldown || overHourlyLimit) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	//* only the newest email works, so the code entered always matches the latest link
	const supersedeRes = await UserTokens.updateMultiple({
		data: {
			revoked_at: new Date(now).toISOString(),
			revoke_reason: constants.userTokenRevokeReasons.magicLinkSuperseded,
		},
		where: [
			{
				key: "user_id",
				operator: "=",
				value: userRes.data.id,
			},
			{
				key: "token_type",
				operator: "=",
				value: constants.userTokens.magicLink,
			},
			{
				key: "revoked_at",
				operator: "is",
				value: null,
			},
			{
				key: "consumed_at",
				operator: "is",
				value: null,
			},
		],
	});
	if (supersedeRes.error) return supersedeRes;

	const code = generateMagicLinkCode();
	const userToken = await createUserToken(context, {
		userId: userRes.data.id,
		tokenType: constants.userTokens.magicLink,
		expiryDate: new Date(
			now + constants.magicLink.expirationMinutes * 60_000,
		).toISOString(),
		code: hashMagicLinkCode(context, code),
		email: userRes.data.email,
	});
	if (userToken.error) return userToken;

	const linkParams = new URLSearchParams({ token: userToken.data.token });
	if (data.redirectPath) linkParams.set("redirect", data.redirectPath);

	const sendEmailRes = await sendEmail(context, {
		type: "internal",
		to: userRes.data.email,
		subject: (emailData) =>
			formatEmailSubject(
				context.translate("server:core.email.magic.link.email.subject"),
				emailData.context.brand.name,
			),
		template: constants.email.templates.magicLink.key,
		data: {
			firstName: userRes.data.first_name,
			code: code,
			loginLink: `${constants.email.locations.magicLink}?${linkParams.toString()}`,
			expiryMinutes: constants.magicLink.expirationMinutes,
		} satisfies BuiltInEmailTemplates["magic-link"],
		storage: constants.email.templates.magicLink.storage,
	});
	if (sendEmailRes.error) return sendEmailRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default send;
