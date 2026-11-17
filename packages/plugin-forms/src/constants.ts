import packageJson from "../package.json" with { type: "json" };

export const PLUGIN_KEY = "@lucidcms/forms";

export const PACKAGE_INFO = {
	name: packageJson.name,
	version: packageJson.version,
};
export const COMPONENTS_MODULE = "@lucidcms/forms/components";

/** Collection editors build forms in, registered unless `builder: false`. */
export const FORMS_COLLECTION_KEY = "forms";
/** Collection submissions are stored in, registered unless `submissions: false`. */
export const SUBMISSIONS_COLLECTION_KEY = "form-submissions";

/** Prefix of the builder bricks made from field types, such as `form-text`, so they can't clash with a project's bricks. */
export const FIELD_BRICK_PREFIX = "form-";

/** What form keys and field names may contain, so they fit in URLs, HTML names and `{{name}}` tokens. */
export const keyPattern = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

/** Widths a field can take on the form's 12-column grid, the same scale as Lucid's own fields. */
export const fieldWidths = [12, 8, 6, 4, 3] as const;

export const formFields = {
	name: "name",
	key: "key",
	submitLabel: "submitLabel",
	confirmationType: "confirmationType",
	confirmationMessage: "confirmationMessage",
	redirectUrl: "redirectUrl",
	store: "store",
	retentionDays: "retentionDays",
	notify: "notify",
	captcha: "captcha",
	honeypot: "honeypot",
	emails: "emails",
	emailTo: "to",
	emailSubject: "subject",
	emailMessage: "message",
	emailReplyTo: "replyTo",
} as const;

/**
 * Fields every field brick has, before its type's own settings. Prefixed, as keys are unique
 * across a brick, so a type's settings are free to use names like `label` in their own fields.
 */
export const brickFields = {
	label: "fieldLabel",
	name: "fieldName",
	required: "fieldRequired",
	width: "fieldWidth",
	help: "fieldHelp",
	placeholder: "fieldPlaceholder",
	defaultValue: "fieldDefaultValue",
} as const;

export const submissionFields = {
	summary: "summary",
	form: "form",
	status: "status",
	values: "values",
	files: "files",
	emails: "emails",
	environment: "environment",
} as const;

export const submissionStatuses = ["new", "read", "spam"] as const;

export const confirmationTypes = {
	message: "message",
	redirect: "redirect",
} as const;

export const routes = {
	/** Where Lucid mounts the content API routes projects and plugins add. */
	contentPrefix: "/api/v1/content/e",
	/** Content API route prefix, beneath `contentPrefix`. */
	content: "/forms",
	/** The page the builder's preview frames for a form, read with the preview's token. */
	preview: "/api/v1/forms/preview",
	/** The script that page starts Lucid's preview with. */
	previewScript: "/api/v1/forms/preview.js",
	/** Admin route a form's markup is read from, as websites get it. */
	markup: "/api/v1/forms/markup",
	/** Admin route a form's submissions are exported from, as CSV. */
	export: "/api/v1/forms/submissions/export",
	/** Admin route prefix a submission's file download URLs are made at, as `<prefix>/<id>/files/<mediaId>/download`. */
	files: "/api/v1/forms/submissions",
} as const;

export const spam = {
	/** The hidden input people never see or fill in. Submissions with a value in it are dropped. */
	honeypot: "_gotcha",
	/** The body field a captcha token may arrive in, when it isn't in the `Lucid-Captcha-Token` header. */
	captchaField: "_captcha",
	captchaHeader: "Lucid-Captcha-Token",
	/** The hidden input naming the page a browser goes back to after posting the form itself. */
	returnField: "_return",
	/** The action captcha tokens must carry. One for every form, as providers limit what an action may contain. */
	captchaAction: "form_submit",
	/** Submissions per IP address within the window, unless `rateLimit` sets another. */
	rateLimit: 10,
	rateLimitWindowMs: 60 * 1000,
} as const;

export const uploads = {
	/** Files a field takes unless its `maxFiles` sets another. */
	maxFiles: 1,
	/** File extensions a file field takes when its `accept` setting names none: common documents and images. */
	defaultAccept: [
		"pdf",
		"png",
		"jpg",
		"jpeg",
		"webp",
		"gif",
		"txt",
		"csv",
		"doc",
		"docx",
		"xls",
		"xlsx",
	],
	bytesPerMb: 1024 * 1024,
	/** Room for a submission's answers beside its files. */
	answerBytes: 1024 * 1024,
	/** Files one submission may hold in all, which with the upload limit caps the body Lucid reads. */
	maxSubmissionFiles: 10,
} as const;

/** What a form says when its definition, or the editor building it, leaves it out. */
export const formDefaults = {
	submitLabel: "Send",
	confirmationMessage: "Thank you. We have received your message.",
} as const;

/** Which media each stored submission's files are. Only the form writes it, so it says what a submission owns whatever its document is changed to. */
export const SUBMISSION_FILES_TABLE = "plugin_forms_submission_files";

/** The permission that reads stored submissions, which their routes, export section and notification go by. */
export const SUBMISSIONS_READ_PERMISSION =
	`documents:${SUBMISSIONS_COLLECTION_KEY}:read` as const;

/** The permission that reads forms editors built. */
export const FORMS_READ_PERMISSION =
	`documents:${FORMS_COLLECTION_KEY}:read` as const;

/** A day, which retention counts in. */
export const DAY_MS = 24 * 60 * 60 * 1000;

export const submissions = {
	/** How many characters of an answer the list's summary keeps. */
	summaryLength: 120,
	/** Submissions the retention job reads and deletes per page. */
	pageSize: 100,
	/** Exports per user within the window. Each one reads every submission of a form. */
	exportRateLimit: 10,
	exportRateLimitWindowMs: 15 * 60 * 1000,
} as const;

/** The email template submissions are sent with, from the plugin's `emails` folder. */
export const EMAIL_TEMPLATE = "forms-submission";
