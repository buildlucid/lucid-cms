import type { z } from "@lucidcms/core";
import type {
	AdminCopyInput,
	CaptchaClientOptions,
	CollectionGroupOptions,
	CollectionLocalizationConfig,
	CollectionPublishingOptions,
	ContentFieldNode,
} from "@lucidcms/core/types";
import type { fieldWidths, submissionStatuses } from "./constants.js";
import type { FormFieldRenderer } from "./shared/render-form.js";

/** How many of the form's 12 columns a field takes. Fields flow onto the next row when a row is full. */
export type FormFieldWidth = (typeof fieldWidths)[number];

/** The HTML control a field is drawn as. */
export type FormFieldControl =
	| "text"
	| "email"
	| "tel"
	| "url"
	| "number"
	| "date"
	| "textarea"
	| "select"
	| "radio"
	| "checkbox"
	| "checkboxes"
	| "file"
	| "hidden";

/**
 * Text for a form defined in code: one string for every language, or a string per content
 * locale, such as `{ en: "Your name", fr: "Votre nom" }`. Locales without one use the default
 * locale's.
 */
export type LocalizedText = string | Readonly<Record<string, string>>;

/** A choice of a select, radio or checkbox group. */
export type FormFieldOption = { label: string; value: string };

/** An answer once it passed its field's checks. File fields have no answer here, their files are stored as media. */
export type FormValue = string | number | boolean | string[] | null;

/** A submission's answers, keyed by field name. */
export type FormValues = Record<string, FormValue>;

/**
 * A field's own settings, such as a select's `options`. The renderer reads `options`, `min`,
 * `max`, `step`, `maxLength`, `rows`, `accept` and `maxFiles`, and ignores the rest.
 */
export type FormFieldSettings = Record<string, unknown>;

/** A field as forms are read, drawn and checked, whether the form came from code or the builder. */
export type FormField = {
	/** The field type's key, such as `text` or a project's own. */
	type: string;
	control: FormFieldControl;
	/** The answer's key in submissions, and its `{{name}}` token in emails. */
	name: string;
	label: string;
	required: boolean;
	width: FormFieldWidth;
	help: string | null;
	placeholder: string | null;
	defaultValue: string | null;
	settings: FormFieldSettings;
};

/** What visitors see once a form is sent: a message in place of the form, or another page. */
export type FormConfirmation =
	| { type: "message"; message: string }
	| { type: "redirect"; url: string };

/**
 * An email sent for each submission. `to`, `subject`, `message` and `replyTo` can hold answers
 * as `{{name}}` tokens, eg. `to: "{{email}}"` for a reply to the person who filled the form in.
 */
export type FormEmail = {
	/** One address or several separated by commas. */
	to: string;
	subject: string;
	/** Text above the answers. Line breaks are kept. */
	message?: string;
	replyTo?: string;
};

/** A choice of a form defined in code, whose label can be given per locale. */
export type FormFieldOptionInput = { label: LocalizedText; value: string };

/** What visitors see once a form defined in code is sent, with its message per locale if you like. */
export type FormConfirmationInput =
	| { type: "message"; message: LocalizedText }
	| { type: "redirect"; url: string };

/** An email a form defined in code sends, with its subject and message per locale if you like. */
export type FormEmailInput = Omit<FormEmail, "subject" | "message"> & {
	subject: LocalizedText;
	message?: LocalizedText;
};

/** A form in full, as the server reads it. Never send it to a browser, it holds recipients. */
export type FormSettings = {
	key: string;
	name: string;
	/** Where the form is defined: in config, or as a document in the forms collection. */
	source: "code" | "collection";
	fields: FormField[];
	submitLabel: string;
	confirmation: FormConfirmation;
	/** The forms collection environment a builder form was read from, which its submissions record. Null for code-defined forms, and builder forms read from latest. */
	environment: string | null;
	/** Whether submissions are kept in the submissions collection. */
	store: boolean;
	/** Days stored submissions are kept, or null to keep them until someone deletes them. */
	retentionDays: number | null;
	/** Whether people with access to submissions are notified of each one. */
	notify: boolean;
	/** Whether a captcha token is checked. Only applies while a captcha adapter is configured. */
	captcha: boolean;
	/** Whether the form has a hidden field bots fill in, whose submissions are dropped. */
	honeypot: boolean;
	emails: FormEmail[];
};

/** What a website needs to draw a form and send it. Safe to send to a browser. */
export type Form = Pick<
	FormSettings,
	"key" | "name" | "fields" | "submitLabel" | "confirmation"
> & {
	/** The URL the form posts to. */
	action: string;
	/** Name of the hidden input that must stay empty, or null when the form has none. */
	honeypot: string | null;
	/** What a captcha widget needs, or null when the form doesn't check one. */
	captcha: {
		/** The captcha adapter's key, which picks the widget. */
		adapter: string;
		client: CaptchaClientOptions;
		/** The action the widget must be given. */
		action: string;
		/** The body field the token is sent in. */
		field: string;
		/** The widget's HTML from `toolkit.captcha.renderWidget`, with its script, which `renderForm` adds with its own. */
		widget: string;
	} | null;
};

/** A file stored for a submission. */
export type SubmissionFile = {
	/** The name of the field it was uploaded to. */
	field: string;
	mediaId: number;
	fileName: string;
	/** Whether anyone with the file's URL can read it. Private files are only served to people who can read the submission. */
	public: boolean;
};

/** What the submissions collection's `values` field holds. */
export type SubmissionValues = {
	/** Answers keyed by field name. */
	data: FormValues;
	/** Each field's label and type when the form was sent, so later edits to the form don't change what was asked. */
	fields: Array<Pick<FormField, "name" | "label" | "type" | "control">>;
	files: SubmissionFile[];
};

export type SubmissionStatus = (typeof submissionStatuses)[number];

/** What `toolkit.forms.submit` takes. */
export type FormSubmitInput = {
	/** The form's key. */
	key: string;
	/** Answers keyed by field name, as the form posted them. */
	values: Record<string, unknown>;
	/** Uploaded files keyed by field name. */
	files?: Record<string, File[]>;
	/** The captcha widget's token, for forms that check one. */
	captchaToken?: string | null;
	/** The content locale to read a builder form's labels in. Defaults to the collection's default. */
	locale?: string;
	/** The builder form's environment, as the form was read in. Defaults to the plugin's `builder.version`. */
	version?: string;
};

export type FormSubmitResult = {
	confirmation: FormConfirmation;
	/** The stored submission's document ID, or null when the form doesn't store them or the submission was dropped as spam. */
	submissionId: number | null;
};

/** Options for reading a form. */
export type FormReadInput = {
	key: string;
	/** The content locale to read a builder form's labels in. Defaults to the collection's default. */
	locale?: string;
	/**
	 * The environment to read a builder form from, such as a staging site's. Defaults to the
	 * plugin's `builder.version`. Only the forms collection's environments and that default are
	 * read, so unpublished forms stay private.
	 */
	version?: string;
};

type FormFieldTypeBase = {
	/** Unique key, such as `rating`. Builder bricks are named `form-<key>`. */
	key: string;
	/** The name editors pick the field by. */
	label: AdminCopyInput;
	description?: AdminCopyInput;
	/**
	 * Extra builder fields editors fill in, beyond the label, name, width and other shared ones.
	 * Their values reach the field's `settings` by field key. Repeaters arrive as arrays of their items' fields.
	 */
	settings?: readonly ContentFieldNode[];
	/**
	 * Markup of its own for fields of this type, in place of its control's. Used wherever Lucid draws
	 * the form: `form()` in site templates, `toolkit.forms.render`, and the builder's preview and
	 * markup. Websites drawing with `renderForm` pass it in its `fields` option.
	 */
	render?: FormFieldRenderer;
	/** Shared builder fields to leave out for this type. */
	without?: ReadonlyArray<
		"placeholder" | "defaultValue" | "required" | "width" | "help"
	>;
};

/**
 * A kind of field forms can hold. File fields are checked against their `accept`, `maxFiles`
 * and `maxSizeMb` settings. Every other type gives a schema for its answers.
 */
export type FormFieldTypeDefinition = FormFieldTypeBase &
	(
		| {
				control: Exclude<FormFieldControl, "file">;
				/**
				 * Builds the schema an answer must pass, from the field's settings. It only sees answers that
				 * were given: empty ones are refused or stored as null by `required`. Its output is stored.
				 */
				schema: (field: FormField) => z.ZodType<FormValue>;
		  }
		| { control: "file"; schema?: never }
	);

/** Settings every field helper takes. */
export type FormFieldSharedOptions = {
	/** Defaults to the field's name. */
	label?: LocalizedText;
	required?: boolean;
	/** Defaults to 12, the whole row. */
	width?: FormFieldWidth;
	help?: LocalizedText;
	placeholder?: LocalizedText;
	defaultValue?: string;
};

/** A field of a form defined in code, as `formField` helpers return it. */
export type FormFieldInput = {
	readonly type: string;
	readonly name: string;
	/** The shared settings, with the field type's own beside them. */
	readonly options?: FormFieldSharedOptions & FormFieldSettings;
};

/** A form defined in code, as `defineForm` takes it. */
export type FormDefinitionInput = {
	/** Unique key, used in the form's URLs. */
	key: string;
	/** Shown in the admin and in emails. Defaults to the key. */
	name?: string;
	fields: readonly FormFieldInput[];
	/** Defaults to "Send". */
	submitLabel?: LocalizedText;
	/** Defaults to a thank-you message. */
	confirmation?: FormConfirmationInput;
	/** Keep submissions in the submissions collection. Defaults to true. */
	store?: boolean;
	/** Days to keep stored submissions. Defaults to the plugin's `submissions.retentionDays`. */
	retentionDays?: number | false;
	/** Notify people who can read submissions. Defaults to true. */
	notify?: boolean;
	/** Check a captcha token while a captcha adapter is configured. Defaults to true. */
	captcha?: boolean;
	/**
	 * Add a hidden field bots fill in, and drop their submissions. Defaults to true. Turn it off for
	 * forms only trusted people reach, such as ones behind a login.
	 */
	honeypot?: boolean;
	emails?: readonly FormEmailInput[];
};

export type FormDefinition = FormDefinitionInput & {
	readonly type: "form-definition";
};

/** Options for the collection editors build forms in. */
export type FormsBuilderOptions = {
	/** Translate labels, messages and choices. Defaults to false. */
	localized?: CollectionLocalizationConfig;
	/** Environments, review and workflow for forms, as on any collection. */
	publishing?: CollectionPublishingOptions;
	/**
	 * The version websites are given: an environment key or `latest`. Defaults to the last
	 * environment in `publishing`, or `latest` without environments.
	 */
	version?: string;
	/** Navigation group. Defaults to a "Forms" group shared with submissions. */
	group?: CollectionGroupOptions;
};

/** Options for the collection submissions are stored in. */
export type FormsSubmissionsOptions = {
	/** Days to keep submissions, unless a form sets its own. Defaults to false, which keeps them until someone deletes them. */
	retentionDays?: number | false;
	/** Navigation group. Defaults to a "Forms" group shared with forms. */
	group?: CollectionGroupOptions;
};

/** Adds forms websites can show and send, with spam checks, emails, notifications and stored submissions. */
export type FormsPluginOptions = {
	/** Forms defined in code with `defineForm`. */
	definitions?: readonly FormDefinition[];
	/** The collection editors build forms in. On by default. Set to false for code-defined forms only. */
	builder?: boolean | FormsBuilderOptions;
	/** The collection submissions are stored in. On by default. Set to false to never store them. */
	submissions?: boolean | FormsSubmissionsOptions;
	/** Field types of your own, made with `defineFormFieldType`, alongside the built-in ones. */
	fieldTypes?: readonly FormFieldTypeDefinition[];
	/**
	 * Submissions one IP address may send within a window. Defaults to 10 a minute. Needs a KV
	 * adapter to count with. Set to false when something in front of Lucid limits them.
	 */
	rateLimit?: false | { limit: number; windowMs: number };
};
