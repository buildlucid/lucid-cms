import crypto from "node:crypto";

/** Creates an RFC 7636 verifier and its S256 authorization challenge. */
const createPkce = () => {
	const codeVerifier = crypto.randomBytes(64).toString("base64url");
	const codeChallenge = crypto
		.createHash("sha256")
		.update(codeVerifier, "ascii")
		.digest("base64url");

	return { codeVerifier, codeChallenge };
};

export default createPkce;
