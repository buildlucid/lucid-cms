import type { FieldTypes } from "../custom-fields/types.js";
import getEmbeddedBrickAccess from "./get-embedded-brick-access.js";
import type { ContentAccess, FieldAccess } from "./types.js";

type FieldNode<TField> = {
	key: string;
	type: FieldTypes;
	value?: unknown;
	translations?: Record<string, unknown>;
	groups?: Array<{ fields: TField[] }>;
};

type BrickNode<TField> = {
	key: string;
	ref: string;
	type: string;
	fields?: TField[];
};

const filterFields = <TField extends FieldNode<TField>>(
	fields: TField[],
	access: ReadonlyMap<string, FieldAccess>,
): TField[] =>
	fields.flatMap((field) => {
		if (access.get(field.key) === "hidden") return [];
		if (field.groups === undefined) return [field];

		return [
			{
				...field,
				groups: field.groups.map((group) => ({
					...group,
					fields: filterFields(group.fields, access),
				})),
			},
		];
	});

/** Omits unreadable fields and bricks from stored input or responses, preserving missing lists and keeping embedded bricks only when every referencing field is readable. */
const filterReadableContent = <
	TField extends FieldNode<TField>,
	TBrick extends BrickNode<TField>,
	TMissing extends null | undefined = never,
>(
	access: ContentAccess,
	content: { fields?: TField[] | TMissing; bricks?: TBrick[] | TMissing },
): { fields?: TField[] | TMissing; bricks?: TBrick[] | TMissing } => {
	const fields = Array.isArray(content.fields)
		? filterFields(content.fields, access.fields)
		: content.fields;
	if (!Array.isArray(content.bricks)) return { fields, bricks: content.bricks };

	const bricks = content.bricks.flatMap((brick) => {
		const brickAccess = access.bricks.get(brick.key);
		if (!brickAccess) return [brick];
		if (brickAccess.access === "hidden") return [];

		return [
			{
				...brick,
				fields:
					brick.fields === undefined
						? undefined
						: filterFields(brick.fields, brickAccess.fields),
			},
		];
	});

	const embeddedAccess = getEmbeddedBrickAccess(access, {
		fields: Array.isArray(content.fields) ? content.fields : [],
		bricks: content.bricks,
	});
	return {
		fields,
		bricks: bricks.filter(
			(brick) =>
				brick.type !== "embedded" ||
				(embeddedAccess.get(brick.ref) ?? "hidden") !== "hidden",
		),
	};
};

export default filterReadableContent;
