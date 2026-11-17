import { editable } from "@lucidcms/client/preview";
import { z } from "@lucidcms/core";
import { createToolkit } from "@lucidcms/core/toolkit";
import type { ServiceFn } from "@lucidcms/core/types";
import {
	brickFields,
	FORMS_COLLECTION_KEY,
	formDefaults,
	formFields,
} from "../../constants.js";
import readText from "../../shared/read-text.js";
import type { RenderFormOptions } from "../../shared/render-form.js";
import type { FormField, Form } from "../../types.js";
import type { FormsPluginOptionsInternal } from "../parse-plugin-options.js";
import readBrickField from "./read-brick-field.js";

const values = z.record(z.string(), z.unknown());

/** The parts of a previewed forms document the reader uses. Loose, to keep the edit targets a preview read puts on it. */
const documentSchema = z.looseObject({
	fields: values,
	bricks: z
		.array(z.looseObject({ key: z.string(), fields: values }))
		.default([]),
});

export type PreviewForm = {
	form: Form;
	/** Marks each part with the brick or field it comes from, so the builder can pick, edit and move it. */
	attributes: NonNullable<RenderFormOptions["attributes"]>;
};

/**
 * Reads the form a builder preview shows, with unsaved edits, by the preview's token. Unlike the
 * form websites get, fields without a name yet are drawn under a placeholder one, so editors see
 * every brick they add. Null when the preview isn't of a form.
 */
const readPreviewForm: ServiceFn<
	[{ options: FormsPluginOptionsInternal; token: string; locale?: string }],
	PreviewForm | null
> = async (context, data) => {
	const toolkit = createToolkit(context);
	const preview = await toolkit.previews.resolve({ token: data.token });
	if (preview.error) return preview;
	if (preview.data.entry.collectionKey !== FORMS_COLLECTION_KEY) {
		return { error: undefined, data: null };
	}

	const defaultLocale = context.config.localization.defaultLocale ?? undefined;
	const documentRes = await toolkit.documents.getSingle({
		collectionKey: FORMS_COLLECTION_KEY,
		version: "latest",
		preview: data.token,
		locale: data.locale ?? defaultLocale,
		fallbackLocale: defaultLocale,
		filter: { id: preview.data.entry.documentId },
		include: ["bricks"],
		depth: 0,
	});
	if (documentRes.error) return documentRes;
	if (documentRes.data === null) return { error: undefined, data: null };

	const document = documentSchema.parse(documentRes.data);
	const bricks = new Map<FormField, (typeof document.bricks)[number]>();
	for (const [index, brick] of document.bricks.entries()) {
		const formField = readBrickField(
			data.options.fieldTypes,
			brick,
			`field-${index + 1}`,
		);
		if (formField) bricks.set(formField, brick);
	}
	const key = readText(document.fields[formFields.key]) ?? "form";

	return {
		error: undefined,
		data: {
			form: {
				key,
				name: readText(document.fields[formFields.name]) ?? key,
				fields: [...bricks.keys()],
				submitLabel:
					readText(document.fields[formFields.submitLabel]) ??
					formDefaults.submitLabel,
				confirmation: {
					type: "message",
					message: formDefaults.confirmationMessage,
				},
				//* the preview can't be sent, so it needs nowhere to post and no captcha
				action: "",
				honeypot: null,
				captcha: null,
			},
			attributes: (part) => {
				if (part.part === "submit") {
					return { ...editable(document, formFields.submitLabel) };
				}
				const brick = bricks.get(part.field);
				if (part.part === "field") return { ...editable(brick) };
				return {
					...editable(
						brick,
						part.part === "label" ? brickFields.label : brickFields.help,
					),
				};
			},
		},
	};
};

export default readPreviewForm;
