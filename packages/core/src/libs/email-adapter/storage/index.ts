export {
	normalizeEmailStorageConfig,
	parseEmailStorageSelector,
} from "./config.js";
export {
	createStoredEmailData,
	resolveEmailData,
	stripNeverStoreEmailData,
} from "./data.js";
export {
	getEmailResendState,
	hasNeverStoreEmailStorageRules,
} from "./resend.js";
export type {
	EmailResendState,
	EmailStorageConfig,
	EmailStorageRule,
} from "./types.js";
