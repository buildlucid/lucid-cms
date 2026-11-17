import { LucidError } from "@lucidcms/core";
import { formDefaults, keyPattern, PLUGIN_KEY } from "../../constants.js";
import isFieldName from "../../shared/is-field-name.js";
import isRecord from "../../shared/is-record.js";
import isSafeRedirect from "../../shared/is-safe-redirect.js";
import type {
	FormDefinition,
	FormFieldTypeDefinition,
	FormSettings,
	LocalizedText,
} from "../../types.js";
import localizeText, { type FormLocale } from "./localize-text.js";
import resolveField from "./resolve-field.js";

/** A text option given in code, which may be a string per locale. */
const isLocalizedText = (value: unknown): value is LocalizedText =>
	typeof value === "string" ||
	(isRecord(value) &&
		Object.values(value).every((text) => typeof text === "string"));

const localizeOptional = (value: unknown, locale: FormLocale): unknown =>
	isLocalizedText(value) ? localizeText(value, locale) : value;

/** Picks the labels of a choice field's options in the locale. */
const localizeOptions = (value: unknown, locale: FormLocale): unknown =>
	Array.isArray(value)
		? value.map((option) =>
				isRecord(option)
					? { ...option, label: localizeOptional(option.label, locale) }
					: option,
			)
		: value;

/**
 * Checks a code-defined form and fills in its defaults, with its text in the locale asked for, so
 * it reads the same as a builder form. Throws for keys and names that can't be used, unknown field
 * types and repeated names.
 */
const resolveCodeForm = (
	definition: FormDefinition,
	props: {
		fieldTypes: Map<string, FormFieldTypeDefinition>;
		/** The plugin's retention, for forms without their own. */
		retentionDays: number | null;
		/** Whether the project has the submissions collection. */
		stores: boolean;
		locale: FormLocale;
	},
): FormSettings => {
	if (!keyPattern.test(definition.key)) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `Form key '${definition.key}' must start with a letter and hold only letters, numbers, hyphens and underscores.`,
		});
	}

	const names = new Set<string>();
	const fields = definition.fields.map((input) => {
		const type = props.fieldTypes.get(input.type);
		if (!type) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: `Form '${definition.key}' uses field type '${input.type}', which isn't a built-in type or one of the plugin's fieldTypes.`,
			});
		}
		if (!isFieldName(input.name)) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: `Field name '${input.name}' on form '${definition.key}' must start with a letter, hold only letters, numbers, hyphens and underscores, and not be a name every object has, such as 'constructor'.`,
			});
		}
		if (names.has(input.name)) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: `Form '${definition.key}' has more than one field named '${input.name}'.`,
			});
		}
		names.add(input.name);

		const {
			label,
			required,
			width,
			help,
			placeholder,
			defaultValue,
			...settings
		} = input.options ?? {};
		return resolveField(type, {
			name: input.name,
			label: localizeOptional(label, props.locale),
			required,
			width,
			help: localizeOptional(help, props.locale),
			placeholder: localizeOptional(placeholder, props.locale),
			defaultValue,
			settings:
				settings.options === undefined
					? settings
					: {
							...settings,
							options: localizeOptions(settings.options, props.locale),
						},
		});
	});

	if (
		definition.confirmation?.type === "redirect" &&
		!isSafeRedirect(definition.confirmation.url)
	) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `Form '${definition.key}' redirects to '${definition.confirmation.url}'. Use a path beginning with a slash, or a full address beginning with http:// or https://.`,
		});
	}

	const { retentionDays } = definition;
	if (
		retentionDays !== undefined &&
		retentionDays !== false &&
		!(Number.isInteger(retentionDays) && retentionDays > 0)
	) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `Form '${definition.key}' keeps submissions for '${retentionDays}' days. Use a whole number of days above zero, or false to keep them.`,
		});
	}

	const store = definition.store ?? true;
	//* files are kept as media that belongs to the stored submission
	if (
		fields.some((field) => field.control === "file") &&
		!(store && props.stores)
	) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `Form '${definition.key}' takes files, so it must store its submissions. Remove 'store: false' and keep the plugin's 'submissions' on.`,
		});
	}

	return {
		key: definition.key,
		name: definition.name ?? definition.key,
		source: "code",
		fields,
		submitLabel:
			definition.submitLabel === undefined
				? formDefaults.submitLabel
				: localizeText(definition.submitLabel, props.locale),
		confirmation:
			definition.confirmation?.type === "redirect"
				? definition.confirmation
				: {
						type: "message",
						message:
							definition.confirmation === undefined
								? formDefaults.confirmationMessage
								: localizeText(definition.confirmation.message, props.locale),
					},
		environment: null,
		store,
		retentionDays:
			retentionDays === undefined ? props.retentionDays : retentionDays || null,
		notify: definition.notify ?? true,
		captcha: definition.captcha ?? true,
		honeypot: definition.honeypot ?? true,
		emails: (definition.emails ?? []).map((email) => ({
			...email,
			subject: localizeText(email.subject, props.locale),
			message:
				email.message === undefined
					? undefined
					: localizeText(email.message, props.locale),
		})),
	};
};

export default resolveCodeForm;
