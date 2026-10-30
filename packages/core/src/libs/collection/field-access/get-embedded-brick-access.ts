import { fieldHooks } from "../custom-fields/registered-fields.js";
import type { FieldTypes } from "../custom-fields/types.js";
import { narrowestAccess } from "./resolve-field-access.js";
import type { ContentAccess, FieldAccess } from "./types.js";

/** A field that can hold embedded bricks, in stored input or document responses. */
type HoldingField = {
	key: string;
	type: FieldTypes;
	value?: unknown;
	translations?: Record<string, unknown>;
	groups?: Array<{ fields: HoldingField[] }>;
};

type HoldingBrick = {
	key: string;
	ref: string;
	type: string;
	fields?: HoldingField[];
};

/** Resolves each referenced embedded brick to the narrowest access allowed by its own permissions and all direct or nested referencing fields, omitting unreferenced refs. */
const getEmbeddedBrickAccess = (
	access: ContentAccess,
	content: { fields: HoldingField[]; bricks: HoldingBrick[] },
): Map<string, FieldAccess> => {
	const result = new Map<string, FieldAccess>();
	const embedded = new Map(
		content.bricks
			.filter((brick) => brick.type === "embedded")
			.map((brick) => [brick.ref, brick]),
	);

	const visit = (
		fields: HoldingField[],
		fieldAccess: ReadonlyMap<string, FieldAccess>,
		parent: FieldAccess,
	) => {
		for (const field of fields) {
			const level = narrowestAccess(
				parent,
				fieldAccess.get(field.key) ?? "editable",
			);
			const extract = fieldHooks[field.type].extractEmbeddedBrickRefs;
			for (const value of [
				field.value,
				...Object.values(field.translations ?? {}),
			]) {
				for (const ref of extract?.(value) ?? []) hold(ref, level);
			}
			for (const group of field.groups ?? []) {
				visit(group.fields, fieldAccess, parent);
			}
		}
	};
	//* access only narrows, so each ref is revisited at most twice and cycles end
	const hold = (ref: string, parent: FieldAccess) => {
		const brick = embedded.get(ref);
		const brickAccess = brick ? access.bricks.get(brick.key) : undefined;
		const level = narrowestAccess(parent, brickAccess?.access ?? "editable");
		const previous = result.get(ref);
		const next =
			previous === undefined ? level : narrowestAccess(previous, level);
		if (next === previous) return;

		result.set(ref, next);
		if (brick)
			visit(brick.fields ?? [], brickAccess?.fields ?? new Map(), next);
	};

	visit(content.fields, access.fields, "editable");
	for (const brick of content.bricks) {
		if (brick.type === "embedded") continue;
		visit(
			brick.fields ?? [],
			access.bricks.get(brick.key)?.fields ?? new Map(),
			"editable",
		);
	}
	return result;
};

export default getEmbeddedBrickAccess;
