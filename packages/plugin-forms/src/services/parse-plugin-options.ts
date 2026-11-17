import { copy, LucidError, z } from "@lucidcms/core";
import type {
	CollectionGroupOptions,
	CollectionLocalizationConfig,
	CollectionPublishingOptions,
} from "@lucidcms/core/types";
import { keyPattern, PLUGIN_KEY, spam } from "../constants.js";
import builtInFieldTypes from "../field-types/index.js";
import isRecord from "../shared/is-record.js";
import type {
	FormSettings,
	FormDefinition,
	FormFieldTypeDefinition,
	FormsPluginOptions,
} from "../types.js";
import type { FormLocale } from "./forms/localize-text.js";
import resolveCodeForm from "./forms/resolve-code-form.js";

const retentionDays = z
	.union([z.literal(false), z.number().int().positive()])
	.default(false);

const optionsSchema = z.strictObject({
	definitions: z
		.array(
			z.custom<FormDefinition>(
				(value) => isRecord(value) && value.type === "form-definition",
				"Define forms with defineForm.",
			),
		)
		.default([]),
	builder: z
		.union([
			z.boolean(),
			z.strictObject({
				localized: z.custom<CollectionLocalizationConfig>().optional(),
				publishing: z.custom<CollectionPublishingOptions>().optional(),
				version: z.string().trim().min(1).optional(),
				group: z.custom<CollectionGroupOptions>().optional(),
			}),
		])
		.default(true),
	submissions: z
		.union([
			z.boolean(),
			z.strictObject({
				retentionDays,
				group: z.custom<CollectionGroupOptions>().optional(),
			}),
		])
		.default(true),
	fieldTypes: z
		.array(
			z.custom<FormFieldTypeDefinition>(
				(value) =>
					isRecord(value) &&
					typeof value.key === "string" &&
					"control" in value,
				"Define field types with defineFormFieldType.",
			),
		)
		.default([]),
	rateLimit: z
		.union([
			z.literal(false),
			z.strictObject({
				limit: z.number().int().positive(),
				windowMs: z.number().int().positive(),
			}),
		])
		.default({ limit: spam.rateLimit, windowMs: spam.rateLimitWindowMs }),
});

type ParsedOptions = z.output<typeof optionsSchema>;

/** The navigation group forms and submissions share unless either is given its own. */
const defaultGroup: CollectionGroupOptions = {
	key: "forms",
	label: copy("admin:plugin.forms.group.label"),
};

export type FormsBuilderOptionsInternal = {
	localized: CollectionLocalizationConfig;
	publishing: CollectionPublishingOptions | undefined;
	/** The version websites are given. */
	version: string;
	group: CollectionGroupOptions;
};

export type FormsSubmissionsOptionsInternal = {
	retentionDays: number | null;
	group: CollectionGroupOptions;
};

export type FormsPluginOptionsInternal = {
	/** Built-in and project field types by key. */
	fieldTypes: Map<string, FormFieldTypeDefinition>;
	/** Code-defined forms, checked and with their defaults filled in, with text in the default locale. */
	forms: FormSettings[];
	/** Reads a code-defined form with its text in a locale. Null when no code-defined form has the key. */
	readCodeForm: (key: string, locale: FormLocale) => FormSettings | null;
	builder: false | FormsBuilderOptionsInternal;
	submissions: false | FormsSubmissionsOptionsInternal;
	rateLimit: ParsedOptions["rateLimit"];
};

const resolveBuilder = (
	builder: ParsedOptions["builder"],
): FormsPluginOptionsInternal["builder"] => {
	if (builder === false) return false;
	const given = builder === true ? {} : builder;

	return {
		localized: given.localized ?? false,
		publishing: given.publishing,
		version:
			given.version ?? given.publishing?.environments?.at(-1)?.key ?? "latest",
		group: given.group ?? defaultGroup,
	};
};

const resolveSubmissions = (
	submissions: ParsedOptions["submissions"],
): FormsPluginOptionsInternal["submissions"] => {
	if (submissions === false) return false;
	const given = submissions === true ? undefined : submissions;

	return {
		retentionDays: given?.retentionDays || null,
		group: given?.group ?? defaultGroup,
	};
};

/** Checks the options when the plugin is created, and resolves field types and code-defined forms. */
const parsePluginOptions = (
	given: FormsPluginOptions = {},
): FormsPluginOptionsInternal => {
	const parsed = optionsSchema.safeParse(given);
	if (!parsed.success) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `Invalid forms plugin options:\n${z.prettifyError(parsed.error)}`,
		});
	}

	const fieldTypes = new Map<string, FormFieldTypeDefinition>();
	for (const type of [...builtInFieldTypes, ...parsed.data.fieldTypes]) {
		if (!keyPattern.test(type.key)) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: `Field type key '${type.key}' must start with a letter and hold only letters, numbers, hyphens and underscores.`,
			});
		}
		if (fieldTypes.has(type.key)) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: `Field type '${type.key}' is defined more than once. Built-in types can't be replaced.`,
			});
		}
		fieldTypes.set(type.key, type);
	}

	const submissions = resolveSubmissions(parsed.data.submissions);
	const definitions = new Map<string, FormDefinition>();
	const resolve = (definition: FormDefinition, locale: FormLocale) =>
		resolveCodeForm(definition, {
			fieldTypes,
			retentionDays: submissions === false ? null : submissions.retentionDays,
			stores: submissions !== false,
			locale,
		});
	//* resolving each one now checks it, so a broken definition fails when the config loads
	const forms: FormSettings[] = [];
	for (const definition of parsed.data.definitions) {
		if (definitions.has(definition.key)) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: `Form '${definition.key}' is defined more than once.`,
			});
		}
		definitions.set(definition.key, definition);
		forms.push(resolve(definition, {}));
	}
	const readCodeForm = (key: string, locale: FormLocale) => {
		const definition = definitions.get(key);
		return definition === undefined ? null : resolve(definition, locale);
	};

	return {
		fieldTypes,
		forms,
		readCodeForm,
		builder: resolveBuilder(parsed.data.builder),
		submissions,
		rateLimit: parsed.data.rateLimit,
	};
};

export default parsePluginOptions;
