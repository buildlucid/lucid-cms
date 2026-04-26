import constants from "../../../constants/constants.js";

export type EmailStorageRuleBase = {
	previewFallback?: unknown;
};

export type EmailStorageEncryptRule = EmailStorageRuleBase & {
	encrypt: true;
	redact?: true;
	neverStore?: never;
};

export type EmailStorageRedactRule = EmailStorageRuleBase & {
	redact: true;
	encrypt?: true;
	neverStore?: never;
};

export type EmailStorageNeverStoreRule = EmailStorageRuleBase & {
	neverStore: true;
	encrypt?: never;
	redact?: never;
};

export type EmailStorageRule =
	| EmailStorageEncryptRule
	| EmailStorageRedactRule
	| EmailStorageNeverStoreRule;

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
