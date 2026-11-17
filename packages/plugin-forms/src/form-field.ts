import type {
	FormFieldInput,
	FormFieldOptionInput,
	FormFieldSettings,
	FormFieldSharedOptions,
} from "./types.js";

type TextOptions = FormFieldSharedOptions & {
	/** The most characters an answer may have. */
	maxLength?: number;
};

type ChoiceOptions = Omit<FormFieldSharedOptions, "defaultValue"> & {
	options: FormFieldOptionInput[];
};

/**
 * Describes the fields of a form defined in code. Names must be unique within the form.
 *
 * @example
 * ```ts
 * const fields = [
 * 	formField.text("name", { label: "Name", required: true, width: 6 }),
 * 	formField.select("topic", {
 * 		label: "Topic",
 * 		options: [
 * 			{ label: "Sales", value: "sales" },
 * 			{ label: "Support", value: "support" },
 * 		],
 * 	}),
 * ];
 * ```
 */
const formField = {
	/** One line of text. */
	text: (name: string, options?: TextOptions): FormFieldInput => ({
		type: "text",
		name,
		options,
	}),
	/** Several lines of text. */
	textarea: (
		name: string,
		options?: TextOptions & { rows?: number },
	): FormFieldInput => ({ type: "textarea", name, options }),
	/** An email address. */
	email: (name: string, options?: FormFieldSharedOptions): FormFieldInput => ({
		type: "email",
		name,
		options,
	}),
	/** A phone number. */
	phone: (name: string, options?: FormFieldSharedOptions): FormFieldInput => ({
		type: "phone",
		name,
		options,
	}),
	/** A web address beginning with http:// or https://. */
	url: (name: string, options?: FormFieldSharedOptions): FormFieldInput => ({
		type: "url",
		name,
		options,
	}),
	/** A number, within `min` and `max` when given. */
	number: (
		name: string,
		options?: FormFieldSharedOptions & {
			min?: number;
			max?: number;
			step?: number;
		},
	): FormFieldInput => ({ type: "number", name, options }),
	/** One choice from a dropdown. */
	select: (name: string, options: ChoiceOptions): FormFieldInput => ({
		type: "select",
		name,
		options,
	}),
	/** One choice from a list of radio buttons. */
	radio: (
		name: string,
		options: Omit<ChoiceOptions, "placeholder">,
	): FormFieldInput => ({ type: "radio", name, options }),
	/** Any number of choices from a list of checkboxes. */
	checkboxes: (
		name: string,
		options: Omit<ChoiceOptions, "placeholder">,
	): FormFieldInput => ({ type: "checkboxes", name, options }),
	/** One box to tick, such as agreeing to terms. */
	checkbox: (
		name: string,
		options?: Omit<FormFieldSharedOptions, "placeholder" | "defaultValue">,
	): FormFieldInput => ({ type: "checkbox", name, options }),
	/** A calendar date. */
	date: (
		name: string,
		options?: Omit<FormFieldSharedOptions, "placeholder">,
	): FormFieldInput => ({ type: "date", name, options }),
	/** A value visitors don't see, sent with the form. */
	hidden: (
		name: string,
		options?: Pick<FormFieldSharedOptions, "label" | "defaultValue">,
	): FormFieldInput => ({ type: "hidden", name, options }),
	/** Files visitors attach, stored as private media unless `public` is set. */
	upload: (
		name: string,
		options?: Omit<FormFieldSharedOptions, "placeholder" | "defaultValue"> & {
			/** File extensions to take, such as `["pdf", "png"]`. Defaults to common documents and images. */
			accept?: string[];
			/** Defaults to 1. */
			maxFiles?: number;
			/** The largest file to take, in megabytes. Defaults to the config's `media.limits.uploadBytes`. */
			maxSizeMb?: number;
			/** Store files where anyone with their URL can read them. Defaults to false. */
			public?: boolean;
		},
	): FormFieldInput => ({ type: "upload", name, options }),
	/** A field of one of the plugin's `fieldTypes`, with its settings beside the shared ones. */
	custom: (
		type: string,
		name: string,
		options?: FormFieldSharedOptions & FormFieldSettings,
	): FormFieldInput => ({ type, name, options }),
};

export default formField;
