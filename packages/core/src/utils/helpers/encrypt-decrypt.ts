import crypto from "node:crypto";
import { translate } from "../../libs/i18n/index.js";
import LucidError from "../errors/lucid-error.js";

const envelopeVersion = "v1";
const algorithm = "aes-256-gcm";
const additionalData = Buffer.from("lucid:aes-256-gcm:v1", "utf8");

const encryptionKeyToBuffer = (encryptionKey: string) =>
	crypto.createHash("sha256").update(encryptionKey, "utf8").digest();

const invalidCiphertext = () =>
	new LucidError({
		message: translate("server:core.security.secrets.encrypted.invalid"),
	});

const decodePart = (value: string, expectedBytes?: number) => {
	if (!/^[A-Za-z0-9_-]*$/.test(value)) {
		throw invalidCiphertext();
	}

	const decoded = Buffer.from(value, "base64url");
	if (expectedBytes !== undefined && decoded.byteLength !== expectedBytes) {
		throw invalidCiphertext();
	}
	return decoded;
};

export const encrypt = (secret: string, encryptionKey: string) => {
	const key = encryptionKeyToBuffer(encryptionKey);
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv(algorithm, key, iv);
	cipher.setAAD(additionalData);

	const encrypted = Buffer.concat([
		cipher.update(secret, "utf8"),
		cipher.final(),
	]);
	const authTag = cipher.getAuthTag();

	return [
		envelopeVersion,
		iv.toString("base64url"),
		encrypted.toString("base64url"),
		authTag.toString("base64url"),
	].join(".");
};

export const decrypt = (encryptedSecret: string, encryptionKey: string) => {
	try {
		const parts = encryptedSecret.split(".");
		if (parts.length !== 4 || parts[0] !== envelopeVersion) {
			throw invalidCiphertext();
		}

		const [, ivPart, encryptedPart, authTagPart] = parts;
		if (
			ivPart === undefined ||
			encryptedPart === undefined ||
			authTagPart === undefined
		) {
			throw invalidCiphertext();
		}

		const key = encryptionKeyToBuffer(encryptionKey);
		const iv = decodePart(ivPart, 12);
		const encrypted = decodePart(encryptedPart);
		const authTag = decodePart(authTagPart, 16);
		const decipher = crypto.createDecipheriv(algorithm, key, iv);
		decipher.setAAD(additionalData);
		decipher.setAuthTag(authTag);

		return Buffer.concat([
			decipher.update(encrypted),
			decipher.final(),
		]).toString("utf8");
	} catch (error) {
		if (error instanceof LucidError) {
			throw error;
		}
		throw invalidCiphertext();
	}
};
