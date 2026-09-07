import { isDeepStrictEqual } from "node:util";
import {
	type ContentContext,
	getDocumentShape,
} from "../../../libs/collection/helpers/get-document-shape.js";
import { copy } from "../../../libs/i18n/index.js";
import type {
	DocumentEditableData,
	DocumentPatch,
} from "../../../libs/toolkit/documents/types.js";
import isPlainObject from "../../../utils/helpers/is-plain-object.js";
import type { ServiceResponse } from "../../../utils/services/types.js";
import mergeDocumentData, {
	mergeItems,
	mergeValue,
} from "./merge-document-data.js";
import resolvePatchTarget from "./resolve-patch-target.js";

const beforeIndex = (
	items: unknown[],
	ref: string | undefined,
): Awaited<ServiceResponse<number>> => {
	if (ref === undefined) return { error: undefined, data: items.length };

	const index = items.findIndex(
		(item: unknown) => isPlainObject(item) && item.ref === ref,
	);
	if (index < 0) {
		return {
			error: {
				status: 400,
				message: copy("server:core.documents.authoring.item.not.found", {
					data: { ref },
				}),
			},
			data: undefined,
		};
	}

	return { error: undefined, data: index };
};

/** Applies ordered changes to an independent copy, leaving the current document unchanged on failure. */
const patchDocumentData = (
	context: ContentContext,
	current: DocumentEditableData,
	operations: DocumentPatch[],
): Awaited<ServiceResponse<DocumentEditableData>> => {
	const data = structuredClone(current);
	const shape = getDocumentShape(context);
	for (const operation of operations) {
		const resolved = resolvePatchTarget(shape, data, operation.path);
		if (resolved.error) return resolved;

		const target = resolved.data;
		switch (operation.op) {
			case "set": {
				if (target.kind === "item") {
					return {
						error: {
							status: 400,
							message: copy(
								"server:core.documents.authoring.patch.item.set.invalid",
							),
						},
						data: undefined,
					};
				}

				const value = mergeValue(
					target.shape,
					operation.value,
					target.value,
					"patch",
				);
				if (value.error) return value;

				target.set(value.data);
				break;
			}
			case "insert": {
				if (
					(target.shape.kind !== "items" && target.shape.kind !== "bricks") ||
					!Array.isArray(target.value)
				) {
					return {
						error: {
							status: 400,
							message: copy(
								"server:core.documents.authoring.patch.insert.invalid",
							),
						},
						data: undefined,
					};
				}

				const normalized = mergeItems(
					target.shape,
					[operation.value],
					undefined,
					"insert",
				);
				if (normalized.error) return normalized;

				const index = beforeIndex(target.value, operation.before);
				if (index.error) return index;

				target.value.splice(index.data, 0, ...normalized.data);
				break;
			}
			case "remove":
			case "move": {
				if (target.kind !== "item") {
					return {
						error: {
							status: 400,
							message: copy(
								"server:core.documents.authoring.patch.item.required",
							),
						},
						data: undefined,
					};
				}

				if (operation.op === "move" && operation.before === target.ref) break;

				const [item] = target.items.splice(target.index, 1);
				if (operation.op === "move") {
					const index = beforeIndex(target.items, operation.before);
					if (index.error) return index;

					target.items.splice(index.data, 0, item);
				}
				break;
			}
			case "connect":
			case "disconnect": {
				if (target.shape.kind !== "value" || !target.shape.relation) {
					return {
						error: {
							status: 400,
							message: copy(
								"server:core.documents.authoring.patch.relation.required",
							),
						},
						data: undefined,
					};
				}

				const values: unknown[] = Array.isArray(target.value)
					? [...target.value]
					: [];
				if (operation.op === "connect") {
					for (const value of operation.values) {
						if (!values.some((existing) => isDeepStrictEqual(value, existing)))
							values.push(value);
					}
					target.set(values);
				} else {
					const remaining = values.filter(
						(value) =>
							!operation.values.some((other) =>
								isDeepStrictEqual(value, other),
							),
					);
					target.set(remaining);
				}
				break;
			}
		}
	}

	return mergeDocumentData(context, data);
};

export default patchDocumentData;
