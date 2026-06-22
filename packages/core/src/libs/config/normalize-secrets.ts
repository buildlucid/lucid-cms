import crypto from "node:crypto";
import type { LucidConfig, SecretConfig } from "../../types/config.js";
import LucidError from "../../utils/errors/lucid-error.js";

const SECRET_LENGTH = 64;

const secretLabels = {
	encryption: "lucid:secrets:encryption",
	cookie: "lucid:secrets:cookie",
	accessToken: "lucid:secrets:access-token",
	refreshToken: "lucid:secrets:refresh-token",
} satisfies Record<keyof SecretConfig, string>;

const deriveSecret = (rootSecret: string, label: string) =>
	crypto.createHmac("sha256", rootSecret).update(label).digest("hex");

const assertRootSecret = (rootSecret: string) => {
	if (rootSecret.length === SECRET_LENGTH) return;

	throw new LucidError({
		message: `Lucid root secret must be ${SECRET_LENGTH} characters long.`,
	});
};

const normalizeSecrets = (secrets: LucidConfig["secrets"]): SecretConfig => {
	if (typeof secrets !== "string") {
		return secrets;
	}

	assertRootSecret(secrets);

	return {
		encryption: deriveSecret(secrets, secretLabels.encryption),
		cookie: deriveSecret(secrets, secretLabels.cookie),
		accessToken: deriveSecret(secrets, secretLabels.accessToken),
		refreshToken: deriveSecret(secrets, secretLabels.refreshToken),
	};
};

export default normalizeSecrets;
