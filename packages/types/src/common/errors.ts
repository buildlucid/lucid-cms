export interface PublicErrorData {
	type?:
		| "validation"
		| "basic"
		| "forbidden"
		| "authorisation"
		| "cron"
		| "plugin"
		| "rate_limit";
	name?: string;
	message?: string;
	status?: number;
	code?:
		| "csrf"
		| "login"
		| "authorisation"
		| "rate_limit"
		| "not_found"
		| "preview_invalid"
		| "preview_expired"
		| "preview_scope"
		| "invalid_request"
		| "invalid_client"
		| "invalid_grant"
		| "invalid_scope"
		| "invalid_token"
		| "access_denied"
		| "unsupported_grant_type"
		| "server_error";
	key?: string;
	errors?: ErrorResult;
}

export type ErrorResultValue =
	| ErrorResultObj
	| ErrorResultObj[]
	| FieldError[]
	| GroupError[]
	| BrickError[]
	| string
	| undefined;

export interface ErrorResultObj {
	code?: string;
	message?: string;
	children?: ErrorResultObj[];
	[key: string]: ErrorResultValue;
}

export type ErrorResult = Record<string, ErrorResultValue>;

export type RichTextFieldErrorReference =
	| {
			type: "rich-text-document";
			collectionKey: string;
			documentId: number;
	  }
	| {
			type: "rich-text-media";
			mediaId: number;
	  }
	| {
			type: "rich-text-variable";
			collectionKey: string;
			documentId: number;
			fieldKey: string;
	  }
	| {
			type: "rich-text-document-link";
			collectionKey: string;
			documentId: number;
	  }
	| {
			type: "rich-text-embedded-brick";
			ref: string;
	  };

export interface FieldErrorMeta {
	reference?: RichTextFieldErrorReference;
}

export interface FieldError {
	key: string;
	localeCode: string | null;
	message: string;
	itemIndex?: number;
	meta?: FieldErrorMeta;
	groupErrors?: Array<GroupError>;
}

export interface GroupError {
	ref: string;
	order: number;
	fields: FieldError[];
}

export interface BrickError {
	ref: string;
	key: string;
	order: number;
	fields: FieldError[];
}
