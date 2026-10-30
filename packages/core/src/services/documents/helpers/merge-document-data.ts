import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
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
import isPlainObject from "../../../utils/helpers/is-plain-object.js";
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

/** Merges arrays by ref and brick key, assigns new defaults and refs, preserves locked repeater membership and order, and allows locked bricks to move without addition or removal. */
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

		const previous =
			parsed.data.ref === undefined || !Array.isArray(current)
				? undefined
				: current.find(
						(item: unknown) =>
							isPlainObject(item) &&
							item.ref === parsed.data.ref &&
							item.key === key,
					);
		const merged = mergeObject(
			fields,
			parsed.data.fields,
			isPlainObject(previous) ? previous.fields : undefined,
			`${path}[${index}].fields`,
		);
		if (merged.error) return merged;

		if (
			shape.kind === "bricks" &&
			typeof key === "string" &&
			shape.locked?.has(key) &&
			previous === undefined
		) {
			return {
				error: {
					status: 403,
					message: copy("server:core.documents.authoring.brick.locked", {
						data: { key, path },
					}),
				},
				data: undefined,
			};
		}

		data.push({
			ref,
			...(typeof key === "string" ? { key } : {}),
			fields: merged.data,
		});
	}

	const currentItems = Array.isArray(current)
		? current.filter((item: unknown) => isPlainObject(item))
		: [];
	if (
		shape.kind === "items" &&
		shape.locked &&
		!isDeepStrictEqual(
			data.map((item) => item.ref),
			currentItems.map((item) => item.ref),
		)
	) {
		return {
			error: {
				status: 403,
				message: copy("server:core.documents.authoring.items.locked", {
					data: { path },
				}),
			},
			data: undefined,
		};
	}

	//* locked builder bricks can move but not be removed; embedded bricks follow their rich text
	const removed =
		shape.kind === "bricks" && !shape.embedded
			? currentItems.find(
					(item) =>
						typeof item.key === "string" &&
						shape.locked?.has(item.key) &&
						!refs.has(String(item.ref)),
				)
			: undefined;
	if (removed) {
		return {
			error: {
				status: 403,
				message: copy("server:core.documents.authoring.brick.locked", {
					data: { key: String(removed.key), path },
				}),
			},
			data: undefined,
		};
	}

	return { error: undefined, data };
};

/** Merges schema objects by key and arrays by ref, replacing whole field values while accepting locked values only when resent unchanged. */
export const mergeValue = (
	shape: DocumentShape,
	input: unknown,
	current: unknown,
	path: string,
): Awaited<ServiceResponse<unknown>> => {
	switch (shape.kind) {
		case "value": {
			const previous =
				current === undefined ? structuredClone(shape.defaultValue) : current;
			if (
				shape.locked &&
				input !== undefined &&
				!isDeepStrictEqual(input, previous)
			) {
				return {
					error: {
						status: 403,
						message: copy("server:core.documents.authoring.field.locked", {
							data: { path },
						}),
					},
					data: undefined,
				};
			}

			return { error: undefined, data: input === undefined ? previous : input };
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
