import { spam } from "../constants.js";
import type { FormField, Form } from "../types.js";
import escapeHtml from "./escape-html.js";
import formScript from "./form-script.js";
import readAccept from "./read-accept.js";
import readNumber from "./read-number.js";
import readOptions from "./read-options.js";

/** HTML attributes by name. False, null and undefined ones are left out, and true is written as a bare name. */
export type FormAttributes = Record<
	string,
	string | number | boolean | null | undefined
>;

/**
 * The pieces of a field's built-in markup, for a renderer of your own to arrange. Keep `error`
 * and give the control `id` and `describedBy`, so the label, help, errors and the form's script
 * still find it.
 */
export type FormFieldParts = {
	/** The control's id, which the label's `for` names. */
	id: string;
	/** For the control's `aria-describedby`: the help text's id, then the error's. */
	describedBy: string;
	/** The field's attributes, such as `data-field` and `data-width`, written out for its outer element. */
	wrapper: string;
	/** The label's text, escaped, with the required mark. */
	label: string;
	/** The help text's element, or an empty string. */
	help: string;
	/** The element the form's script writes the field's error into. */
	error: string;
	/** The field's built-in markup, to wrap or adjust. */
	html: () => string;
	/** Writes attributes, escaping their values. */
	attrs: (attributes: FormAttributes) => string;
	escape: (text: string) => string;
};

/** Writes a field of your own, given the field and the pieces of its built-in markup. */
export type FormFieldRenderer = (
	field: FormField,
	parts: FormFieldParts,
) => string;

/** A part of a drawn form that `attributes` can add to. `label` is the label's text, which gets a `<span>` of its own. */
export type FormPart =
	| { part: "submit" }
	| { part: "field" | "label" | "help"; field: FormField };

export type RenderFormOptions = {
	/**
	 * How a posted form came back: `sent` shows the form's message in its place, and `error` a line
	 * above it. The submit route returns browsers that posted the form themselves with
	 * `?form=<key>&status=<status>`.
	 */
	status?: "sent" | "error";
	/** Shown above the form for `status: "error"`. */
	errorMessage?: string;
	/**
	 * The page's address or path, such as `/contact`, which browsers that post the form themselves
	 * are sent back to. Needed when the website and the CMS are on different origins, as browsers
	 * then only say which site a post came from. Defaults to the page the post names.
	 */
	returnUrl?: string;
	/**
	 * Adds the small inline script that sends the form in place, with errors beside their fields,
	 * and the captcha widget. Defaults to true. Turn it off to send the form with your own
	 * script, or allow the scripts' hashes in your Content Security Policy, as each is the same for
	 * every form.
	 */
	script?: boolean;
	/** Extra attributes for a part of the form, such as your own classes. */
	attributes?: (part: FormPart) => FormAttributes | undefined;
	/**
	 * Markup of your own for fields, by field type key, such as `rating` or the built-in `select`.
	 * Field types with a `render` of their own use it where Lucid draws the form, so only pass
	 * these to change a field's markup on your website.
	 */
	fields?: Readonly<Record<string, FormFieldRenderer>>;
};

/** Writes attributes, leaving out false, null and undefined ones and writing true as a bare name. */
const attrs = (attributes: FormAttributes): string =>
	Object.entries(attributes)
		.flatMap(([name, value]) => {
			if (value === false || value === null || value === undefined) return [];
			return value === true
				? [` ${name}`]
				: [` ${name}="${escapeHtml(String(value))}"`];
		})
		.join("");

/** What browsers may fill a control with, for controls whose type says what they hold. */
const autocomplete: Partial<Record<FormField["control"], string>> = {
	email: "email",
	tel: "tel",
	url: "url",
};

/** Shows a field is required to people who can see the label. Screen readers get `required` instead. */
const requiredMark = (formField: FormField) =>
	formField.required ? ' <span aria-hidden="true">*</span>' : "";

/** The id of the form, and of the message that replaces it, which the submit route sends browsers back to. */
export const formId = (key: string) => `form-${key}`;

/** The control itself, for fields drawn as one input beneath a label. */
const renderControl = (
	formField: FormField,
	id: string,
	describedBy: string,
): string => {
	const { settings } = formField;
	const shared: FormAttributes = {
		id,
		name: formField.name,
		required: formField.required,
		"aria-describedby": describedBy,
	};

	switch (formField.control) {
		case "textarea":
			return `<textarea${attrs({
				...shared,
				rows: readNumber(settings, "rows") ?? 5,
				maxlength: readNumber(settings, "maxLength"),
				placeholder: formField.placeholder,
			})}>${escapeHtml(formField.defaultValue ?? "")}</textarea>`;
		case "select": {
			const options = readOptions(settings)
				.map(
					(option) =>
						`<option${attrs({ value: option.value })}>${escapeHtml(option.label)}</option>`,
				)
				.join("");
			//* the label stands in for a missing prompt, so the empty choice is never read as blank
			return `<select${attrs(shared)}><option value="">${escapeHtml(formField.placeholder ?? formField.label)}</option>${options}</select>`;
		}
		case "file": {
			const multiple = (readNumber(settings, "maxFiles") ?? 1) > 1;
			return `<input${attrs({
				...shared,
				type: "file",
				accept: readAccept(settings)
					.map((extension) => `.${extension}`)
					.join(","),
				multiple,
			})}>`;
		}
		default:
			return `<input${attrs({
				...shared,
				type: formField.control,
				value: formField.defaultValue,
				autocomplete: autocomplete[formField.control],
				placeholder: formField.placeholder,
				min: readNumber(settings, "min"),
				max: readNumber(settings, "max"),
				//* a number input without a step only takes whole numbers, which the server doesn't ask for
				step:
					readNumber(settings, "step") ??
					(formField.control === "number" ? "any" : undefined),
				maxlength: readNumber(settings, "maxLength"),
			})}>`;
	}
};

/** The pieces of a field's markup, which both the built-in markup and renderers of your own use. */
const fieldParts = (
	form: Form,
	formField: FormField,
	extra: NonNullable<RenderFormOptions["attributes"]>,
): Omit<FormFieldParts, "html"> => {
	const id = `${form.key}-${formField.name}`;

	const help = formField.help
		? `<p${attrs({ id: `${id}-help`, "data-help": true, ...extra({ part: "help", field: formField }) })}>${escapeHtml(formField.help)}</p>`
		: "";
	const error = `<p${attrs({ id: `${id}-error`, "data-error": formField.name, hidden: true })}></p>`;
	const describedBy = `${formField.help ? `${id}-help ` : ""}${id}-error`;
	const wrapper = attrs({
		"data-field": formField.name,
		"data-control": formField.control,
		//* how many of 12 columns the field asks for
		"data-width": formField.width,
		"data-required": formField.required,
		...extra({ part: "field", field: formField }),
	});
	const labelAttrs = extra({ part: "label", field: formField });
	//* the text gets an element of its own only when something marks it, as labels also hold boxes and the required mark
	const text = labelAttrs
		? `<span${attrs(labelAttrs)}>${escapeHtml(formField.label)}</span>`
		: escapeHtml(formField.label);

	return {
		id,
		describedBy,
		wrapper,
		label: `${text}${requiredMark(formField)}`,
		help,
		error,
		attrs,
		escape: escapeHtml,
	};
};

/** A field's built-in markup, by its control. */
const renderBuiltInField = (
	formField: FormField,
	parts: Omit<FormFieldParts, "html">,
): string => {
	const { id, describedBy, wrapper, label, help, error } = parts;
	if (formField.control === "hidden") {
		return `<input${attrs({ type: "hidden", name: formField.name, value: formField.defaultValue })}>`;
	}

	if (formField.control === "checkbox") {
		const input = `<input${attrs({
			id,
			type: "checkbox",
			name: formField.name,
			value: "on",
			required: formField.required,
			"aria-describedby": describedBy,
		})}>`;
		return `<div${wrapper}><label${attrs({ for: id })}>${input} ${label}</label>${help}${error}</div>`;
	}

	if (formField.control === "radio" || formField.control === "checkboxes") {
		const type = formField.control === "radio" ? "radio" : "checkbox";
		const options = readOptions(formField.settings)
			.map((option, index) => {
				const input = `<input${attrs({
					id: `${id}-${index}`,
					type,
					name: formField.name,
					value: option.value,
					//* a group of checkboxes can't be marked required in HTML without requiring every box
					required: formField.required && type === "radio",
				})}>`;
				return `<label${attrs({ for: `${id}-${index}`, "data-option": option.value })}>${input} ${escapeHtml(option.label)}</label>`;
			})
			.join("");
		return `<fieldset${wrapper}${attrs({ "aria-describedby": describedBy })}><legend>${label}</legend>${options}${help}${error}</fieldset>`;
	}

	return `<div${wrapper}><label${attrs({ for: id })}>${label}</label>${renderControl(formField, id, describedBy)}${help}${error}</div>`;
};

/** A field's markup: the renderer of your own for its type, or the built-in one. */
const renderField = (
	form: Form,
	formField: FormField,
	options: RenderFormOptions,
	extra: NonNullable<RenderFormOptions["attributes"]>,
): string => {
	const parts = fieldParts(form, formField, extra);
	const html = () => renderBuiltInField(formField, parts);
	const custom = options.fields?.[formField.type];
	return custom ? custom(formField, { ...parts, html }) : html();
};

/**
 * Writes a form as plain, accessible HTML with no styles, and a small inline script that sends it
 * in place. Without the script, the browser checks required fields and types, posts the form
 * itself and is sent back to the page. Everything from the form
 * is escaped. Data attributes say what each part is, for your own styles and scripts:
 * `data-form` (the form's key), `data-fields`, `data-field` (a field's name, with its
 * `data-control`, `data-width` out of 12 columns and `data-required`), `data-option`,
 * `data-help`, `data-error`, `data-status`, `data-honeypot`, `data-captcha` and `data-submit`.
 * Required fields have a `*` in their label, hidden from screen readers, which read `required`.
 * A form that checks a captcha gets its widget with the script. Without it, draw a widget
 * yourself, writing its token to a `_captcha` input.
 *
 * @example
 * ```ts
 * const form = await toolkit.forms.get({ key: "contact" });
 * const html = form.data ? renderForm(form.data) : "";
 * ```
 */
const renderForm = (form: Form, options: RenderFormOptions = {}): string => {
	const extra = options.attributes ?? (() => undefined);
	if (options.status === "sent" && form.confirmation.type === "message") {
		return `<div${attrs({ id: formId(form.key), "data-form": form.key, "data-sent": true, role: "status", tabindex: -1 })}><p>${escapeHtml(form.confirmation.message)}</p></div>`;
	}

	const hasFiles = form.fields.some(
		(formField) => formField.control === "file",
	);
	//* on the page from the start, as screen readers only announce changes to live regions they already know of
	const status =
		options.status === "error"
			? `<div role="alert" data-status>${escapeHtml(options.errorMessage ?? "Something went wrong. Check your answers and try again.")}</div>`
			: '<div role="status" data-status></div>';
	const script = options.script !== false;
	const captcha = script && form.captcha ? form.captcha.widget : "";
	const honeypot =
		form.honeypot === null
			? ""
			: `<div data-honeypot hidden><label>Leave this field empty <input${attrs({ type: "text", name: form.honeypot, tabindex: -1, autocomplete: "off" })}></label></div>`;

	const returnTo =
		options.returnUrl === undefined
			? ""
			: `<input${attrs({ type: "hidden", name: spam.returnField, value: options.returnUrl })}>`;

	return `<form${attrs({
		method: "post",
		action: form.action,
		enctype: hasFiles ? "multipart/form-data" : undefined,
		id: formId(form.key),
		"data-form": form.key,
	})}>${status}<div data-fields>${form.fields
		.map((formField) => renderField(form, formField, options, extra))
		.join(
			"",
		)}</div>${honeypot}${returnTo}${captcha}<button${attrs({ type: "submit", "data-submit": true, ...extra({ part: "submit" }) })}>${escapeHtml(form.submitLabel)}</button></form>${script ? `<script>${formScript}</script>` : ""}`;
};

export default renderForm;
