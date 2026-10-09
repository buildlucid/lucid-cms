import type z from "zod";
import type { DocumentObjectShape } from "../../../../libs/collection/helpers/get-document-shape.js";
import { copy } from "../../../../libs/i18n/index.js";
import type {
	DocumentEditableData,
	DocumentPatch,
} from "../../../../libs/toolkit/documents/types.js";
import type { ServiceResponse } from "../../../../utils/services/types.js";
import expandProjectedValue from "../../helpers/expand-projected-value.js";
import type { brickChangeSchema } from "./schema.js";

/** Builds patch operations from projected fields and brick changes while preserving omitted stored values. */
const buildOperations = (props: {
	shape: DocumentObjectShape;
	current: DocumentEditableData;
	fields?: Record<string, unknown>;
	bricks?: z.output<typeof brickChangeSchema>[];
	locale: string | null;
}): Awaited<ServiceResponse<DocumentPatch[]>> => {
	const fieldsShape = props.shape.children.get("fields");
	const bricksShape = props.shape.children.get("bricks");
	const brickFields = (family: string, key: string) => {
		const shape =
			bricksShape?.kind === "object"
				? bricksShape.children.get(family)
				: undefined;
		if (shape?.kind === "object") return shape.children.get(key);
		if (shape?.kind === "bricks") return shape.fields.get(key);
		return undefined;
	};
	const expand = (
		shape: ReturnType<typeof brickFields>,
		value: Record<string, unknown> | undefined,
	) => (shape ? expandProjectedValue(shape, value ?? {}, props.locale) : value);

	const operations: DocumentPatch[] = [];
	if (props.fields && fieldsShape) {
		operations.push({
			op: "set",
			path: ["fields"],
			value: expandProjectedValue(fieldsShape, props.fields, props.locale),
		});
	}

	for (const brick of props.bricks ?? []) {
		//* fixed bricks have no ref, so a ref naming one is read as its key
		const fixedRef =
			brick.ref !== undefined && brick.ref in props.current.bricks.fixed;
		if (fixedRef && brick.key !== undefined && brick.key !== brick.ref) {
			return {
				error: {
					status: 400,
					message: copy("server:core.documents.authoring.brick.key.mismatch", {
						data: { ref: brick.ref, key: brick.key },
					}),
				},
				data: undefined,
			};
		}

		const ref = fixedRef ? undefined : brick.ref;
		const key = fixedRef ? brick.ref : brick.key;
		if (ref !== undefined) {
			const family = props.current.bricks.builder.some(
				(item) => item.ref === ref,
			)
				? "builder"
				: "embedded";
			const item = props.current.bricks[family].find(
				(candidate) => candidate.ref === ref,
			);
			if (!item) {
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

			//* a key alongside the ref, eg. from documents_get, must match the brick
			const path = [
				"bricks",
				family,
				key === undefined ? { ref } : { ref, key },
			];
			if (brick.remove) {
				operations.push({ op: "remove", path });
				continue;
			}
			if (brick.fields) {
				operations.push({
					op: "set",
					path: [...path, "fields"],
					value: expand(brickFields(family, item.key), brick.fields),
				});
			}
			if (brick.before) {
				operations.push({ op: "move", path, before: brick.before });
			}
			continue;
		}

		//* the schema requires a ref or a key
		if (key === undefined) continue;
		if (key in props.current.bricks.fixed) {
			operations.push({
				op: "set",
				path: ["bricks", "fixed", key],
				value: expand(brickFields("fixed", key), brick.fields),
			});
			continue;
		}

		operations.push({
			op: "insert",
			path: ["bricks", "builder"],
			value: { key, fields: expand(brickFields("builder", key), brick.fields) },
			before: brick.before,
		});
	}

	return { error: undefined, data: operations };
};

export default buildOperations;
