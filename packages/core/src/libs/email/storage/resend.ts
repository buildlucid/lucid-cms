import constants from "../../../constants/constants.js";
import type { ServiceResponse } from "../../../utils/services/types.js";
import { parseEmailStorageRules } from "./config.js";
import type { EmailResendState, EmailStorageConfig } from "./types.js";

/**
 * Checks if an email strategy contains data that is removed after send.
 */
export const hasNeverStoreEmailStorageRules = (
	storage?: EmailStorageConfig | null,
): Awaited<ServiceResponse<boolean>> => {
	const rulesRes = parseEmailStorageRules(storage);
	if (rulesRes.error) return rulesRes;

	return {
		error: undefined,
		data: rulesRes.data.some(({ rule }) => rule.neverStore === true),
	};
};

/**
 * Calculates whether the UI and API can offer resend for a stored email.
 */
export const getEmailResendState = (props: {
	createdAt: Date | string | null;
	storage?: EmailStorageConfig | null;
	resendWindowDays: number;
	now?: Date;
}): Awaited<ServiceResponse<EmailResendState>> => {
	const hasNeverStoreRes = hasNeverStoreEmailStorageRules(props.storage);
	if (hasNeverStoreRes.error) return hasNeverStoreRes;

	const createdAt =
		props.createdAt instanceof Date
			? props.createdAt
			: props.createdAt
				? new Date(props.createdAt)
				: null;

	const validCreatedAt =
		createdAt !== null && !Number.isNaN(createdAt.getTime());
	const resendWindowMs =
		Math.max(0, props.resendWindowDays) *
		constants.email.storage.millisecondsInDay;
	const now = props.now ?? new Date();
	const active =
		validCreatedAt && now.getTime() - createdAt.getTime() <= resendWindowMs;

	return {
		error: undefined,
		data: {
			enabled: active && !hasNeverStoreRes.data,
			...(active && hasNeverStoreRes.data
				? { reason: "unstoredData" as const }
				: {}),
			...(!active ? { reason: "outsideResendWindow" as const } : {}),
		},
	};
};
