import crypto from "node:crypto";
import constants from "../../../constants/constants.js";
import type { ServiceContext } from "../../../utils/services/types.js";

const hashFlowValue = (
	context: ServiceContext,
	purpose: "browser" | "state",
	value: string,
) =>
	crypto
		.createHmac("sha256", context.config.secrets.encryption)
		.update(`lucid-connection:${purpose}\0`, "utf8")
		.update(value, "utf8")
		.digest("hex");

/** Creates an indexed, purpose-separated digest without storing OAuth state. */
export const hashLucidRemoteConnectionState = (
	context: ServiceContext,
	state: string,
) => hashFlowValue(context, "state", state);

/** Creates the same-browser binding digest stored inside pending ciphertext. */
export const hashConnectionBrowserBinding = (
	context: ServiceContext,
	value: string,
) => hashFlowValue(context, "browser", value);

/** Compares fixed-size flow digests without data-dependent early returns. */
export const connectionDigestMatches = (actual: string, expected: string) => {
	const actualBuffer = Buffer.from(actual, "hex");
	const expectedBuffer = Buffer.from(expected, "hex");

	return (
		actualBuffer.length === 32 &&
		expectedBuffer.length === 32 &&
		crypto.timingSafeEqual(actualBuffer, expectedBuffer)
	);
};

/** Isolates the browser cookie namespace for each outstanding OAuth flow. */
export const getConnectionFlowCookieName = (
	context: ServiceContext,
	state: string,
) =>
	`${constants.cookies.connectionFlowPrefix}${hashLucidRemoteConnectionState(context, state)}`;

/** Returns the short-lived same-browser OAuth flow cookie policy. */
export const getConnectionFlowCookieOptions = (callbackUrl: string) => {
	const callback = new URL(callbackUrl);

	return {
		httpOnly: true,
		secure: callback.protocol === "https:",
		sameSite: "lax" as const,
		path: callback.pathname,
		maxAge: constants.connection.pendingExpirationSeconds,
	};
};
