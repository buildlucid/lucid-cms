import { fieldHooks } from "../../../../libs/collection/custom-fields/registered-fields.js";
import type { FieldRefMapper } from "../../../../libs/collection/custom-fields/types.js";
import type { FieldAccess } from "../../../../libs/collection/field-access/types.js";
import {
	type ContentContext,
	type DocumentObjectShape,
	type DocumentShape,
	getDocumentShape,
	type Owner,
} from "../../../../libs/collection/helpers/get-document-shape.js";
import resolveCollectionLocalization from "../../../../libs/collection/helpers/resolve-collection-localization.js";
import type { DocumentEditableData } from "../../../../libs/toolkit/documents/types.js";
import isPlainObject from "../../../../utils/helpers/is-plain-object.js";
import type { DocumentEntry } from "../schema.js";

/** What was left out while fitting values to this site's collection, by path. */
export type TransferDataLeftOut = {
	/** Fields and bricks this site's collection doesn't have. */
	unknown: string[];
	/** Fields and bricks the actor can't change, so they keep their stored values. */
	restricted: string[];
	/** Locales this site's collection doesn't have. */
	locales: string[];
};

/**
 * Adapts fields and locales to the target collection and remaps references. Omits unsupported or
 * restricted values to preserve stored content.
 * @remarks Parse with `documentDataSchema` before saving.
 */
const prepareTransferData = (props: {
	context: ContentContext;
	data: unknown;
	/** Field keys the source site stored per locale. Without it, values are taken to match this site. */
	localized?: DocumentEntry["localized"];
	/** The document's readable content when updating, so bricks the actor can't change stay as stored. */
	current?: DocumentEditableData;
	/** Stored embedded bricks' access from the fields holding them, so bricks locked rich text holds stay as stored. */
	embeddedAccess?: ReadonlyMap<string, FieldAccess>;
	map: FieldRefMapper;
}): { data: Record<string, unknown>; leftOut: TransferDataLeftOut } => {
	const { access, ...structure } = props.context;
	const full = getDocumentShape(structure);
	const allowed = access?.restricted ? getDocumentShape(props.context) : full;
	const { defaultLocale } = resolveCollectionLocalization(props.context);
	const leftOut: TransferDataLeftOut = {
		unknown: [],
		restricted: [],
		locales: [],
	};

	//* empty values, eg. defaults of fields this site removed, are left out without a warning
	const hasContent = (value: unknown): boolean => {
		if (value === null || value === undefined || value === "") return false;
		if (Array.isArray(value)) return value.some(hasContent);
		if (isPlainObject(value)) return Object.values(value).some(hasContent);
		return true;
	};
	type BrickShape = Extract<DocumentShape, { kind: "bricks" }>;
	/** Whether an incoming brick is fitted, kept as stored, or left out because this site or the actor doesn't allow it. */
	const brickFate = (
		shape: BrickShape,
		allowedShape: BrickShape,
		brick: { key: string; ref?: string },
		storedRefs: ReadonlySet<string>,
	): "fit" | "stored" | "unknown" | "restricted" => {
		if (!shape.fields.has(brick.key)) return "unknown";

		const allowedFields = allowedShape.fields.get(brick.key);
		const held =
			shape.embedded && brick.ref !== undefined
				? props.embeddedAccess?.get(brick.ref)
				: undefined;
		if (
			allowedFields &&
			!allowedShape.locked?.has(brick.key) &&
			(held === undefined || held === "editable")
		) {
			return "fit";
		}
		//* bricks the actor can't change can only move, so they keep their stored content
		return allowedFields && brick.ref !== undefined && storedRefs.has(brick.ref)
			? "stored"
			: "restricted";
	};
	const readBricks = (input: unknown) =>
		Array.isArray(input)
			? input.flatMap((brick) =>
					isPlainObject(brick) && typeof brick.key === "string"
						? [
								{
									key: brick.key,
									ref: typeof brick.ref === "string" ? brick.ref : undefined,
									fields: brick.fields,
								},
							]
						: [],
				)
			: [];

	//* rich text can't keep links to embedded bricks that are left out, unless storage keeps them
	const embeddedShape = full.children.get("bricks");
	const allowedEmbeddedShape = allowed.children.get("bricks");
	const embedded =
		embeddedShape?.kind === "object"
			? embeddedShape.children.get("embedded")
			: undefined;
	const allowedEmbedded =
		allowedEmbeddedShape?.kind === "object"
			? allowedEmbeddedShape.children.get("embedded")
			: undefined;
	const storedEmbedded = new Set(
		(props.current?.bricks.embedded ?? []).map((brick) => brick.ref),
	);
	const leftOutEmbedded = new Set(
		embedded?.kind === "bricks" && allowedEmbedded?.kind === "bricks"
			? readBricks(
					isPlainObject(props.data) && isPlainObject(props.data.bricks)
						? props.data.bricks.embedded
						: undefined,
				).flatMap((brick) => {
					const fate = brickFate(
						embedded,
						allowedEmbedded,
						brick,
						storedEmbedded,
					);
					return brick.ref !== undefined &&
						(fate === "unknown" ||
							(fate === "restricted" && !props.embeddedAccess?.has(brick.ref)))
						? [brick.ref]
						: [];
				})
			: [],
	);

	const sourceLocalized = (owner: Owner, key: string) => {
		if (!props.localized) return undefined;
		const keys =
			owner === props.context.collection
				? props.localized.fields
				: props.localized.bricks[owner.key];
		return keys?.includes(key) ?? false;
	};

	const fitObject = (
		shape: DocumentObjectShape,
		allowedShape: DocumentObjectShape,
		input: unknown,
		path: string,
	): Record<string, unknown> => {
		const result: Record<string, unknown> = {};
		if (!isPlainObject(input)) return result;

		for (const [key, value] of Object.entries(input)) {
			const childPath = path ? `${path}.${key}` : key;
			const child = shape.children.get(key);
			if (!child) {
				if (!hasContent(value)) continue;
				if (shape.localized) {
					if (!leftOut.locales.includes(key)) leftOut.locales.push(key);
				} else leftOut.unknown.push(childPath);
				continue;
			}

			const allowedChild = allowedShape.children.get(key);
			if (!allowedChild) {
				if (hasContent(value)) leftOut.restricted.push(childPath);
				continue;
			}

			const fitted = fitValue(
				child,
				allowedChild,
				value,
				childPath,
				shape.localized === true,
			);
			if (fitted !== undefined) result[key] = fitted;
		}

		return result;
	};

	const fitBricks = (
		shape: BrickShape,
		allowedShape: BrickShape,
		input: unknown,
		path: string,
	) => {
		const current =
			(shape.embedded
				? props.current?.bricks.embedded
				: props.current?.bricks.builder) ?? [];
		const storedRefs = new Set(current.map((brick) => brick.ref));
		const fitted = readBricks(input).flatMap((brick) => {
			const brickPath = `${path}.${brick.key}`;
			const fate = brickFate(shape, allowedShape, brick, storedRefs);
			const fields = shape.fields.get(brick.key);
			const allowedFields = allowedShape.fields.get(brick.key);
			if (fate === "stored" && brick.ref !== undefined) {
				return [{ ref: brick.ref, key: brick.key, fields: {} }];
			}
			if (fate !== "fit" || !fields || !allowedFields) {
				leftOut[fate === "unknown" ? "unknown" : "restricted"].push(brickPath);
				return [];
			}

			return [
				{
					...(brick.ref !== undefined ? { ref: brick.ref } : {}),
					key: brick.key,
					fields: fitObject(fields, allowedFields, brick.fields, brickPath),
				},
			];
		});

		//* stored bricks the actor can't remove go back where they were, and embedded ones stay for the rich text holding them
		const kept = new Set(fitted.map((brick) => brick.ref));
		for (const [index, brick] of current.entries()) {
			if (kept.has(brick.ref)) continue;
			const fate = brickFate(shape, allowedShape, brick, storedRefs);
			if (fate !== "stored") continue;

			fitted.splice(Math.min(index, fitted.length), 0, {
				ref: brick.ref,
				key: brick.key,
				fields: {},
			});
		}
		return fitted;
	};

	const fitValue = (
		shape: DocumentShape,
		allowedShape: DocumentShape,
		input: unknown,
		path: string,
		/** True for one locale's value inside a localized field. */
		inLocale: boolean,
	): unknown => {
		switch (shape.kind) {
			case "object": {
				if (allowedShape.kind !== "object") return undefined;

				const first = shape.localized
					? shape.children.values().next().value
					: undefined;
				const source =
					first?.kind === "value"
						? sourceLocalized(first.owner, first.field.key)
						: undefined;
				//* the source site didn't localize this field, so its value fills the default locale.
				//* Files without localization details are only wrapped when the value can't be per locale.
				const value =
					first !== undefined &&
					defaultLocale !== null &&
					(source === false || (source === undefined && !isPlainObject(input)))
						? { [defaultLocale]: input }
						: input;
				return fitObject(shape, allowedShape, value, path);
			}
			case "value": {
				if (allowedShape.kind === "value" && allowedShape.locked) {
					if (hasContent(input)) leftOut.restricted.push(path);
					return undefined;
				}
				//* the source site localized this field, so keep the default locale's value
				const value =
					!inLocale &&
					isPlainObject(input) &&
					sourceLocalized(shape.owner, shape.field.key) === true
						? ((defaultLocale !== null ? input[defaultLocale] : undefined) ??
							Object.values(input).find(hasContent) ??
							null)
						: input;
				const hooks = fieldHooks[shape.field.type];
				const mapped = hooks.mapRefs ? hooks.mapRefs(value, props.map) : value;
				return leftOutEmbedded.size > 0 && hooks.removeEmbeddedBrickRefs
					? hooks.removeEmbeddedBrickRefs(mapped, leftOutEmbedded)
					: mapped;
			}
			case "items": {
				if (allowedShape.kind !== "items" || allowedShape.locked) {
					if (hasContent(input)) leftOut.restricted.push(path);
					return undefined;
				}
				if (!Array.isArray(input)) return undefined;

				return input.flatMap((item, index) =>
					isPlainObject(item)
						? [
								{
									...(typeof item.ref === "string" ? { ref: item.ref } : {}),
									fields: fitObject(
										shape.fields,
										allowedShape.fields,
										item.fields,
										`${path}[${index}]`,
									),
								},
							]
						: [],
				);
			}
			case "bricks": {
				if (allowedShape.kind !== "bricks" || !Array.isArray(input)) {
					return undefined;
				}
				return fitBricks(shape, allowedShape, input, path);
			}
		}
	};

	return {
		data: fitObject(full, allowed, props.data, ""),
		leftOut,
	};
};

export default prepareTransferData;
