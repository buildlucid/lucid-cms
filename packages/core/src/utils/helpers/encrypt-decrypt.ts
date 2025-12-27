import crypto from "node:crypto";
import T from "../../translations/index.js";
import LucidError from "../errors/lucid-error.js";

const encryptionKeyToHex = (encryptionKey: string) =>
	crypto
		.createHash("sha512")
		.update(encryptionKey)
		.digest("hex")
		.substring(0, 32);

export const encrypt = (secret: string, encryptionKey: string) => {
	const key = encryptionKeyToHex(encryptionKey);
	const iv = crypto.randomBytes(16).toString("hex").slice(0, 16);
	const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
	let encrypted = cipher.update(secret, "utf8", "hex");
	encrypted += cipher.final("hex");
	return `${iv}:${encrypted}`;
};

export const decrypt = (encryptedSecret: string, encryptionKey: string) => {
	const [iv, encrypted] = encryptedSecret.split(":");
	if (!iv || !encrypted) {
		throw new LucidError({
			message: T("invalid_encrypted_secret"),
		});
	}
	const key = encryptionKeyToHex(encryptionKey);
	const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
	let decrypted = decipher.update(encrypted as string, "hex", "utf8");
	decrypted += decipher.final("utf8");
	return decrypted.toString();
};
