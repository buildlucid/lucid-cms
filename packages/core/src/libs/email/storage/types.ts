import constants from "../../../constants/constants.js";

export type EmailStorageRuleBase = {
	/** Value displayed in previews when the original is hidden. */
	previewFallback?: unknown;
};

/** Encrypt the selected value in stored email data. */
export type EmailStorageEncryptRule = EmailStorageRuleBase & {
	encrypt: true;
	redact?: true;
	neverStore?: never;
};

/** Hide the selected value from email previews. May be combined with encryption. */
export type EmailStorageRedactRule = EmailStorageRuleBase & {
	redact: true;
	encrypt?: true;
	neverStore?: never;
};

/** Remove the selected value from retained email history. Emails with this rule cannot be resent. */
export type EmailStorageNeverStoreRule = EmailStorageRuleBase & {
	neverStore: true;
	encrypt?: never;
	redact?: never;
};

/** Choose encryption, preview redaction or removal from retained history. */
export type EmailStorageRule =
	| EmailStorageEncryptRule
	| EmailStorageRedactRule
	| EmailStorageNeverStoreRule;

/**
 * Rules keyed by template-data paths. Supports dot paths, array indexes and [*] wildcards.
 *
 * @example
 * ```ts
 * const storage: EmailStorageConfig = {
 *   "customer.email": { encrypt: true, redact: true },
 *   "resetToken": { neverStore: true, previewFallback: "[hidden]" },
 * };
 * ```
 */
export type EmailStorageConfig = Record<string, EmailStorageRule>;

export type EmailResendState = {
	enabled: boolean;
	reason?: "outsideResendWindow" | "unstoredData";
};

export type EmailStoragePathSegment =
	| {
			type: "key";
			key: string;
	  }
	| {
			type: "index";
			index: number;
	  }
	| {
			type: "wildcard";
	  };

export type EmailStorageConcretePath = Array<string | number>;

export type ParsedEmailStorageRule = {
	selector: string;
	rule: EmailStorageRule;
	segments: EmailStoragePathSegment[];
	index: number;
	specificity: number;
};

export type EmailStorageEncryptedValue = {
	[constants.email.storage.encryptedValueMarker]: true;
	version: typeof constants.email.storage.encryptedValueVersion;
	value: string;
};
