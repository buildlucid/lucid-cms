import { copy, z } from "@lucidcms/core";
import { resolveCollectionLocalization } from "@lucidcms/core/extension";
import { createToolkit } from "@lucidcms/core/toolkit";
import type { ServiceFn } from "@lucidcms/core/types";
import {
	confirmationTypes,
	FORMS_COLLECTION_KEY,
	formDefaults,
	formFields,
} from "../../constants.js";
import isSafeRedirect from "../../shared/is-safe-redirect.js";
import type { FormSettings, FormEmail } from "../../types.js";
import type {
	FormsBuilderOptionsInternal,
	FormsPluginOptionsInternal,
} from "../parse-plugin-options.js";
import readBrickField from "./read-brick-field.js";

const values = z.record(z.string(), z.unknown());

/** The parts of a forms document the reader uses, as a content read in one locale returns them. */
const documentSchema = z.object({
	fields: values,
	bricks: z.array(z.object({ key: z.string(), fields: values })).default([]),
});

/** Reads a document value as trimmed text, or null when it is empty. Unlike `readText`, editors' stray spaces are dropped. */
const trimmedText = (value: unknown): string | null =>
	typeof value === "string" && value.trim() !== "" ? value.trim() : null;

const readEmails = (value: unknown): FormEmail[] => {
	const items = z.array(values).safeParse(value);
	if (!items.success) return [];

	return items.data.flatMap((item) => {
		const to = trimmedText(item[formFields.emailTo]);
		const subject = trimmedText(item[formFields.emailSubject]);
		if (to === null || subject === null) return [];

		return [
			{
				to,
				subject,
				message: trimmedText(item[formFields.emailMessage]) ?? undefined,
				replyTo: trimmedText(item[formFields.emailReplyTo]) ?? undefined,
			},
		];
	});
};

/**
 * Reads a form editors built, by its key, from the environment asked for or else the version
 * websites are given. Bricks of field
 * types the config no longer has, and ones without a usable name, are left out. Null when no form
 * has the key.
 */
const readCollectionForm: ServiceFn<
	[
		{
			options: FormsPluginOptionsInternal;
			builder: FormsBuilderOptionsInternal;
			key: string;
			locale?: string;
			version?: string;
		},
	],
	FormSettings | null
> = async (context, data) => {
	const environments = (data.builder.publishing?.environments ?? []).map(
		(environment) => environment.key,
	);
	const version = data.version ?? data.builder.version;
	//* only what websites may be given, so a public read can't reach unpublished forms in latest
	if (version !== data.builder.version && !environments.includes(version)) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:plugin.forms.version.unknown", {
					data: { version },
				}),
			},
			data: undefined,
		};
	}

	const collection = context.config.collections.find(
		(item) => item.key === FORMS_COLLECTION_KEY,
	);
	//* the collection's own default when it sets one, which may differ from the project's
	const defaultLocale =
		(collection
			? resolveCollectionLocalization({
					localization: context.config.localization,
					collection,
				}).defaultLocale
			: context.config.localization.defaultLocale) ?? undefined;
	const documentRes = await createToolkit(context).documents.getSingle({
		collectionKey: FORMS_COLLECTION_KEY,
		version,
		//* a locale makes the read return each field's one value, the default locale's when none is asked for
		locale: data.locale ?? defaultLocale,
		//* translations left empty read as the default locale's, so a half-translated form keeps its labels
		fallbackLocale: defaultLocale,
		filter: { fields: { [formFields.key]: data.key } },
		include: ["bricks"],
		depth: 0,
	});
	if (documentRes.error) return documentRes;
	if (documentRes.data === null) return { error: undefined, data: null };

	const document = documentSchema.parse(documentRes.data);
	const { fields } = document;
	const names = new Set<string>();

	const formFieldList = document.bricks.flatMap((brick) => {
		const formField = readBrickField(data.options.fieldTypes, brick);
		//* saves refuse repeated names, so this only guards documents written around them
		if (formField === null || names.has(formField.name)) return [];
		names.add(formField.name);
		return [formField];
	});

	const redirectUrl = trimmedText(fields[formFields.redirectUrl]);
	const retentionDays = fields[formFields.retentionDays];
	const submissions = data.options.submissions;

	return {
		error: undefined,
		data: {
			key: data.key,
			name: trimmedText(fields[formFields.name]) ?? data.key,
			source: "collection",
			fields: formFieldList,
			submitLabel:
				trimmedText(fields[formFields.submitLabel]) ?? formDefaults.submitLabel,
			confirmation:
				fields[formFields.confirmationType] === confirmationTypes.redirect &&
				redirectUrl !== null &&
				//* saves refuse other addresses, so this only guards documents written around them
				isSafeRedirect(redirectUrl)
					? { type: "redirect", url: redirectUrl }
					: {
							type: "message",
							message:
								trimmedText(fields[formFields.confirmationMessage]) ??
								formDefaults.confirmationMessage,
						},
			//* unticked boxes read as false, and forms saved before a setting existed as null
			environment: environments.includes(version) ? version : null,
			store: fields[formFields.store] !== false,
			retentionDays:
				typeof retentionDays === "number" && retentionDays > 0
					? retentionDays
					: submissions === false
						? null
						: submissions.retentionDays,
			notify: fields[formFields.notify] !== false,
			captcha: fields[formFields.captcha] !== false,
			honeypot: fields[formFields.honeypot] !== false,
			emails: readEmails(fields[formFields.emails]),
		},
	};
};

export default readCollectionForm;
