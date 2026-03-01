import { createHash } from "node:crypto";

/**
 * Creates a deterministic SHA-256 hex digest for a user token so the raw token
 * never needs to be stored in `lucid_user_tokens`.
 */
const hashUserToken = (token: string): string =>
	createHash("sha256").update(token).digest("hex");

export default hashUserToken;
