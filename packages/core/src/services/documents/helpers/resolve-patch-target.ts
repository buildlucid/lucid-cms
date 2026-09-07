import type { DocumentShape } from "../../../libs/collection/helpers/get-document-shape.js";
import { copy } from "../../../libs/i18n/index.js";
import type { DocumentPatch } from "../../../libs/toolkit/documents/types.js";
import isPlainObject from "../../../utils/helpers/is-plain-object.js";
import type { ServiceResponse } from "../../../utils/services/types.js";
import readDocumentObject from "./read-document-object.js";

type PatchTarget = {
	shape: DocumentShape;
	value: unknown;
	set: (value: unknown) => void;
} & (
	| { kind: "field" }
	| { kind: "item"; items: unknown[]; index: number; ref: string }
);

/** Resolves schema paths and stable item refs. Compound field values cannot be traversed. */
const resolvePatchTarget = (
	shape: DocumentShape,
	value: unknown,
	path: DocumentPatch["path"],
): Awaited<ServiceResponse<PatchTarget>> => {
	const [segment, ...rest] = path;
	if (segment === undefined) {
		return {
			error: {
				status: 400,
				message: copy("server:core.documents.authoring.patch.path.empty"),
			},
			data: undefined,
		};
	}

	if (shape.kind === "object" && typeof segment === "string") {
		const child = shape.children.get(segment);
		if (!child) {
			return {
				error: {
					status: 400,
					message: copy("server:core.documents.authoring.field.unknown", {
						data: { key: segment },
					}),
				},
				data: undefined,
			};
		}

		const values = readDocumentObject(value, segment);
		if (values.error) return values;
		if (rest.length === 0) {
			return {
				error: undefined,
				data: {
					kind: "field",
					shape: child,
					value: values.data[segment],
					set: (next) => {
						values.data[segment] = next;
					},
				},
			};
		}

		return resolvePatchTarget(child, values.data[segment], rest);
	}

	if (
		(shape.kind === "items" || shape.kind === "bricks") &&
		typeof segment === "object" &&
		Array.isArray(value)
	) {
		const index = value.findIndex(
			(item: unknown) => isPlainObject(item) && item.ref === segment.ref,
		);
		if (index < 0) {
			return {
				error: {
					status: 400,
					message: copy("server:core.documents.authoring.item.not.found", {
						data: { ref: segment.ref },
					}),
				},
				data: undefined,
			};
		}

		const item = readDocumentObject(value[index], "item");
		if (item.error) return item;
		if (segment.key !== undefined && item.data.key !== segment.key) {
			return {
				error: {
					status: 400,
					message: copy("server:core.documents.authoring.brick.key.mismatch", {
						data: { ref: segment.ref, key: segment.key },
					}),
				},
				data: undefined,
			};
		}

		const fields =
			shape.kind === "items"
				? shape.fields
				: typeof item.data.key === "string"
					? shape.fields.get(item.data.key)
					: undefined;
		if (!fields) {
			return {
				error: {
					status: 400,
					message: copy("server:core.documents.authoring.brick.key.unknown"),
				},
				data: undefined,
			};
		}

		const child: DocumentShape = {
			kind: "object",
			children: new Map([["fields", fields]]),
		};
		if (rest.length === 0) {
			return {
				error: undefined,
				data: {
					kind: "item",
					shape: child,
					value: value[index],
					items: value,
					index,
					ref: segment.ref,
					set: (next) => {
						value[index] = next;
					},
				},
			};
		}

		return resolvePatchTarget(child, value[index], rest);
	}

	return {
		error: {
			status: 400,
			message: copy("server:core.documents.authoring.patch.path.invalid"),
		},
		data: undefined,
	};
};

export default resolvePatchTarget;
