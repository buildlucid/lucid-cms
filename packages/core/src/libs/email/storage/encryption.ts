import constants from "../../../constants/constants.js";
import T from "../../../translations/index.js";
import { decrypt, encrypt } from "../../../utils/helpers/encrypt-decrypt.js";
import type { ServiceResponse } from "../../../utils/services/types.js";
import { isRecord } from "./paths.js";
import type { EmailStorageEncryptedValue } from "./types.js";

const isEncryptedEmailStorageValue = (
	value: unknown,
): value is EmailStorageEncryptedValue =>
	isRecord(value) &&
	value[constants.email.storage.encryptedValueMarker] === true &&
	value.version === constants.email.storage.encryptedValueVersion &&
	typeof value.value === "string";

export const encryptEmailStorageValue = (
	value: unknown,
	encryptionKey: string,
): Awaited<ServiceResponse<EmailStorageEncryptedValue>> => {
	try {
		return {
			error: undefined,
			data: {
				[constants.email.storage.encryptedValueMarker]: true,
				version: constants.email.storage.encryptedValueVersion,
				value: encrypt(JSON.stringify({ value }), encryptionKey),
			},
		};
	} catch (_) {
		return {
			error: {
				type: "validation",
				status: 400,
				message: T("email_storage_encrypt_failed"),
			},
			data: undefined,
		};
	}
};

export const decryptEmailStorageValue = (
	value: unknown,
	encryptionKey: string,
): Awaited<ServiceResponse<unknown>> => {
	if (!isEncryptedEmailStorageValue(value)) {
		return {
			error: undefined,
			data: value,
		};
	}

	try {
		const decrypted = decrypt(value.value, encryptionKey);
		return {
			error: undefined,
			data: (JSON.parse(decrypted) as { value: unknown }).value,
		};
	} catch (_) {
		return {
			error: {
				type: "validation",
				status: 400,
				message: T("email_storage_decrypt_failed"),
			},
			data: undefined,
		};
	}
};
