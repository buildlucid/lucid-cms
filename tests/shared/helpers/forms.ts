import type { ApiResponse, Lucid, Session } from "#harness/client";
import { CONTACT_FORM_KEY } from "../config/fragments/forms.ts";
import {
	type BrickInput,
	type DocumentInput,
	expectStatus,
	type FieldInput,
} from "./documents.ts";

export const FORMS_KEY = "forms";
export const SUBMISSIONS_KEY = "form-submissions";

/** Where websites read forms and post them. */
export const formPath = (key: string) => `/api/v1/content/e/forms/${key}`;

export type FormResponse = {
	data: {
		key: string;
		name: string;
		action: string;
		honeypot: string | null;
		submitLabel: string;
		confirmation:
			| { type: "message"; message: string }
			| { type: "redirect"; url: string };
		captcha: {
			adapter: string;
			action: string;
			field: string;
			widget: string;
		} | null;
		fields: Array<{
			type: string;
			control: string;
			name: string;
			label: string;
			required: boolean;
			width: number;
			settings: Record<string, unknown>;
		}>;
	};
};

export type SubmitResponse = {
	data?: { confirmation: FormResponse["data"]["confirmation"] };
	message?: string;
	errors?: { values?: Record<string, { code: string; message: string }> };
};

/** Answers the code-defined contact form accepts, with any changes on top. */
export const contactAnswers = (
	changes: Record<string, unknown> = {},
): Record<string, unknown> => ({
	name: "Ada Lovelace",
	email: `ada-${crypto.randomUUID()}@example.com`,
	topic: "sales",
	seats: 3,
	interests: ["news"],
	message: "Hello there",
	terms: true,
	...changes,
});

/**
 * Posts a form as a website's script does, as JSON from a new visitor, so no test runs into
 * another's rate limit.
 */
export const submitForm = (
	lucid: Lucid,
	key: string,
	values: Record<string, unknown>,
	options: { session?: Session; headers?: Record<string, string> } = {},
): Promise<ApiResponse<SubmitResponse>> =>
	(options.session ?? lucid.session()).request<SubmitResponse>({
		method: "POST",
		path: `${formPath(key)}/submit`,
		body: values,
		headers: options.headers,
		csrf: false,
	});

type SubmissionDocument = {
	id: number;
	fields: Array<{ key: string; value?: unknown }>;
};

/** A stored submission's fields by key. */
export type Submission = {
	id: number;
	summary: string;
	form: string;
	status: string;
	/** The forms collection environment the form was read from, when it was one. */
	environment?: string;
	emails: number[];
	values: {
		data: Record<string, unknown>;
		fields: Array<{ name: string; label: string; type: string }>;
		files: Array<{
			field: string;
			mediaId: number;
			fileName: string;
			public: boolean;
		}>;
	};
};

const toSubmission = (document: SubmissionDocument): Submission => {
	const value = (key: string) =>
		document.fields.find((item) => item.key === key)?.value;
	return {
		id: document.id,
		summary: value("summary") as string,
		form: value("form") as string,
		status: value("status") as string,
		//* an empty select reads as an empty string
		environment: (value("environment") as string | undefined) || undefined,
		emails: (value("emails") as number[] | undefined) ?? [],
		values: value("values") as Submission["values"],
	};
};

/**
 * Lists a form's stored submissions as the admin's list shows them, newest first. The list
 * leaves out linked emails, which `readSubmission` returns.
 */
export const listSubmissions = async (
	admin: Session,
	form: string = CONTACT_FORM_KEY,
): Promise<Submission[]> => {
	const listed = await admin.request<{ data: SubmissionDocument[] }>({
		path: `/api/v1/documents/${SUBMISSIONS_KEY}/latest`,
		query: { "filter[fields.form]": form, sort: "-createdAt", perPage: 100 },
	});
	expectStatus("Listing submissions", listed, 200);

	return listed.body.data.map(toSubmission);
};

/** Reads one stored submission in full, as the admin opens it. */
export const readSubmission = async (
	admin: Session,
	id: number,
): Promise<Submission> => {
	const read = await admin.request<{ data: SubmissionDocument }>({
		path: `/api/v1/documents/${SUBMISSIONS_KEY}/${id}/latest`,
		query: { include: "bricks" },
	});
	expectStatus(`Reading submission ${id}`, read, 200);

	return toSubmission(read.body.data);
};

/** Finds the stored submission whose summary is `summary`, such as a visitor's email address. */
export const findSubmission = async (
	admin: Session,
	summary: string,
	form: string = CONTACT_FORM_KEY,
): Promise<Submission | undefined> =>
	(await listSubmissions(admin, form)).find((item) => item.summary === summary);

const text = (key: string, value: string): FieldInput => ({
	key,
	type: "text",
	value,
});

/**
 * Builds forms as editors do, for the CMS under test. Text editors translate is given in every
 * locale the setup has, as a required translation must be filled in each.
 */
export const formBuilder = (lucid: Lucid) => {
	const locales = lucid.capabilities.flatMap((capability) =>
		capability.startsWith("locale:")
			? [capability.slice("locale:".length)]
			: [],
	);
	const translated = (key: string, value: string): FieldInput =>
		locales.length === 0
			? text(key, value)
			: {
					key,
					type: "text",
					translations: Object.fromEntries(
						locales.map((locale) => [locale, value]),
					),
				};

	return {
		/** A document field holding text editors translate, in every locale the setup has. */
		text: translated,
		/** A builder brick for one form field, with its type's own settings in `settings`. */
		field: (
			order: number,
			type: string,
			options: {
				name: string;
				/** The label in every locale, or each locale's own. Defaults to the name. */
				label?: string | Record<string, string>;
				required?: boolean;
				width?: number;
				settings?: FieldInput[];
			},
		): BrickInput => ({
			ref: `field-${order}`,
			key: `form-${type}`,
			order,
			type: "builder",
			fields: [
				typeof options.label === "object"
					? { key: "fieldLabel", type: "text", translations: options.label }
					: translated("fieldLabel", options.label ?? options.name),
				text("fieldName", options.name),
				//* hidden values aren't shown, so they have no width and can't be required
				...(type === "hidden"
					? []
					: [
							{
								key: "fieldWidth",
								type: "select",
								value: String(options.width ?? 12),
							},
							{
								key: "fieldRequired",
								type: "checkbox",
								value: options.required ?? false,
							},
						]),
				...(options.settings ?? []),
			],
		}),
		/** A select, radio or checkboxes brick's choices, labelled with their values in capitals. */
		choices: (values: string[]): FieldInput => ({
			key: "options",
			type: "repeater",
			groups: values.map((value, order) => ({
				ref: `option-${value}`,
				order,
				fields: [
					translated("label", value.toUpperCase()),
					text("value", value),
				],
			})),
		}),
		/** A form document: its name and key, its fields as bricks, and any other fields. */
		form: (options: {
			key: string;
			name?: string;
			bricks: BrickInput[];
			fields?: FieldInput[];
		}): DocumentInput => ({
			fields: [
				text("name", options.name ?? options.key),
				text("key", options.key),
				//* a later field with the same key replaces an earlier one
				...[
					{ key: "confirmationType", type: "select", value: "message" },
					...(options.fields ?? []),
				].filter(
					(field, index, all) =>
						all.findLastIndex((other) => other.key === field.key) === index,
				),
			],
			bricks: options.bricks,
		}),
	};
};

/** A key no other test's form uses, in a database tests share. */
export const uniqueFormKey = (prefix: string) =>
	`${prefix}-${crypto.randomUUID().slice(0, 8)}`;
