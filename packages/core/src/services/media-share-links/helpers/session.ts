import crypto from "node:crypto";
import constants from "../../../constants/constants.js";
import type { ServiceContext } from "../../../utils/services/types.js";

/** Signs a session with the link's token and stored password hash, so a new password ends it. */
const signSession = (
	context: ServiceContext,
	props: { token: string; password: string; expiresAt: number },
) =>
	crypto
		.createHmac("sha256", context.config.secrets.encryption)
		.update("lucid-share-link:session\0", "utf8")
		.update(`${props.token}\0${props.password}\0${props.expiresAt}`, "utf8")
		.digest("base64url");

/** Creates a signed `<expiry>.<signature>` session cookie. */
export const createShareSession = (
	context: ServiceContext,
	props: { token: string; password: string },
) => {
	const expiresAt =
		Math.floor(Date.now() / 1000) + constants.shareLinkExpiration;
	return `${expiresAt}.${signSession(context, { ...props, expiresAt })}`;
};

/** Checks session expiry and signature against the link's current password. */
export const verifyShareSession = (
	context: ServiceContext,
	props: { token: string; password: string; session: string | undefined },
) => {
	const [expiresPart, signature] = props.session?.split(".") ?? [];
	const expiresAt = Number(expiresPart);
	if (
		!signature ||
		!Number.isInteger(expiresAt) ||
		expiresAt <= Math.floor(Date.now() / 1000)
	) {
		return false;
	}

	const actual = Buffer.from(signature, "utf8");
	const expected = Buffer.from(
		signSession(context, {
			token: props.token,
			password: props.password,
			expiresAt,
		}),
		"utf8",
	);
	return (
		actual.length === expected.length &&
		crypto.timingSafeEqual(actual, expected)
	);
};
