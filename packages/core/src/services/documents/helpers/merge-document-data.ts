import { randomUUID } from "node:crypto";
import {
	type ContentContext,
	type DocumentObjectShape,
	type DocumentShape,
	getDocumentShape,
} from "../../../libs/collection/helpers/get-document-shape.js";
import { copy } from "../../../libs/i18n/index.js";
import {
	documentBrickSchema,
	documentEditableDataSchema,
	documentGroupSchema,
} from "../../../libs/toolkit/documents/authoring-values-schema.js";
import type {
	DocumentData,
	DocumentEditableData,
} from "../../../libs/toolkit/documents/types.js";
import type { ServiceResponse } from "../../../utils/services/types.js";
import readDocumentObject from "./read-document-object.js";

const mergeObject = (
	shape: DocumentObjectShape,
	input: unknown,
	current: unknown,
	path: string,
): Awaited<ServiceResponse<Record<string, unknown>>> => {
	const patch = readDocumentObject(input === undefined ? {} : input, path);
	if (patch.error) return patch;

	const previous = readDocumentObject(
		current === undefined ? {} : current,
		path,
	);
	if (previous.error) return previous;

	for (const key of Object.keys(patch.data)) {
		if (!shape.children.has(key)) {
			return {
				error: {
					status: 400,
					message: copy(
						"server:core.documents.authoring.field.unknown.at.path",
						{ data: { path, key } },
					),
				},
				data: undefined,
			};
		}
	}

	const data: Record<string, unknown> = {};
	for (const [key, child] of shape.children) {
		const value = mergeValue(
			child,
			patch.data[key],
			previous.data[key],
			`${path}.${key}`,
		);
		if (value.error) return value;

		data[key] = value.data;
	}

	return { error: undefined, data };
};

/** Resolves complete array items and assigns references to new repeaters and builder bricks. */
export const mergeItems = (
	shape: Extract<DocumentShape, { kind: "items" | "bricks" }>,
	input: unknown,
	current: unknown,
	path: string,
): Awaited<
	ServiceResponse<
		Array<{ ref: string; key?: string; fields: Record<string, unknown> }>
	>
> => {
	const value = input === undefined ? (current ?? []) : input;
	if (!Array.isArray(value)) {
		return {
			error: {
				status: 400,
				message: copy("server:core.documents.authoring.array.required", {
					data: { path },
				}),
			},
			data: undefined,
		};
	}

	const refs = new Set<string>();
	const data: Array<{
		ref: string;
		key?: string;
		fields: Record<string, unknown>;
	}> = [];
	for (const [index, item] of value.entries()) {
		const parsed =
			shape.kind === "items"
				? documentGroupSchema.safeParse(item)
				: documentBrickSchema.safeParse(item);

		if (!parsed.success) {
			return {
				error: {
					status: 400,
					message: copy("server:core.documents.authoring.item.invalid", {
						data: { path, index },
					}),
				},
				data: undefined,
			};
		}

		const ref =
			parsed.data.ref ??
			(shape.kind === "bricks" && shape.embedded ? undefined : randomUUID());
		if (!ref) {
			return {
				error: {
					status: 400,
					message: copy(
						"server:core.documents.authoring.embedded.ref.required",
						{ data: { path, index } },
					),
				},
				data: undefined,
			};
		}

		if (refs.has(ref)) {
			return {
				error: {
					status: 400,
					message: copy(
						"server:core.documents.authoring.ref.duplicate.at.path",
						{ data: { ref, path } },
					),
				},
				data: undefined,
			};
		}

		refs.add(ref);
		const key = "key" in parsed.data ? parsed.data.key : undefined;
		const fields =
			shape.kind === "items"
				? shape.fields
				: typeof key === "string"
					? shape.fields.get(key)
					: undefined;
		if (!fields) {
			return {
				error: {
					status: 400,
					message: copy(
						"server:core.documents.authoring.brick.unknown.at.path",
						{ data: { key: String(key), path } },
					),
				},
				data: undefined,
			};
		}

		const merged = mergeObject(
			fields,
			parsed.data.fields,
			undefined,
			`${path}[${index}].fields`,
		);
		if (merged.error) return merged;

		data.push({
			ref,
			...(typeof key === "string" ? { key } : {}),
			fields: merged.data,
		});
	}

	return { error: undefined, data };
};

/** Merges schema objects by key. Field values and arrays replace the whole value. */
export const mergeValue = (
	shape: DocumentShape,
	input: unknown,
	current: unknown,
	path: string,
): Awaited<ServiceResponse<unknown>> => {
	switch (shape.kind) {
		case "value": {
			const data =
				input === undefined
					? current === undefined
						? structuredClone(shape.defaultValue)
						: current
					: input;
			return { error: undefined, data };
		}
		case "object":
			return mergeObject(shape, input, current, path);
		case "items":
		case "bricks":
			return mergeItems(shape, input, current, path);
	}
};

/** Resolves partial authoring values against current content and collection defaults. */
const mergeDocumentData = (
	context: ContentContext,
	input: DocumentData,
	current?: DocumentEditableData,
): Awaited<ServiceResponse<DocumentEditableData>> => {
	const merged = mergeObject(
		getDocumentShape(context),
		input,
		current,
		"document",
	);
	if (merged.error) return merged;

	const parsed = documentEditableDataSchema.safeParse(merged.data);
	if (!parsed.success) {
		return {
			error: {
				status: 400,
				message: copy("server:core.documents.authoring.structure.invalid"),
				zod: parsed.error,
			},
			data: undefined,
		};
	}

	return { error: undefined, data: parsed.data };
};

export default mergeDocumentData;
