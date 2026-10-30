import getEmbeddedBrickAccess from "../../../libs/collection/field-access/get-embedded-brick-access.js";
import type {
	ContentAccess,
	FieldAccess,
} from "../../../libs/collection/field-access/types.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../schemas/collection-fields.js";
import { filterReachableEmbeddedBricks } from "../../documents-bricks/helpers/prepare-bricks-and-fields.js";

type DocumentInput = {
	fields: FieldInputSchema[];
	bricks: BrickInputSchema[];
};

/** Keeps submitted fields the actor can change and the stored value of every other field, matching repeater groups by ref. */
const restoreFields = (
	submitted: FieldInputSchema[],
	stored: FieldInputSchema[],
	access: ReadonlyMap<string, FieldAccess>,
): FieldInputSchema[] => {
	const editable = (field: FieldInputSchema) =>
		(access.get(field.key) ?? "editable") === "editable";

	const kept = submitted.filter(editable).map((field) => {
		if (field.groups === undefined) return field;

		const storedGroups =
			stored.find((storedField) => storedField.key === field.key)?.groups ?? [];
		return {
			...field,
			groups: field.groups.map((group) => ({
				...group,
				fields: restoreFields(
					group.fields,
					storedGroups.find((storedGroup) => storedGroup.ref === group.ref)
						?.fields ?? [],
					access,
				),
			})),
		};
	});

	return [...kept, ...stored.filter((field) => !editable(field))];
};

/** Matches bricks by type and key, also requiring ref equality for builder and embedded bricks. */
const isSameBrick = (a: BrickInputSchema, b: BrickInputSchema) =>
	a.type === b.type &&
	a.key === b.key &&
	(a.type === "fixed" || a.ref === b.ref);

/**
 * Rebuilds a full-payload save so it only changes what the actor can change.
 * - Hidden or locked fields keep their stored value. New ones are left out so their default applies.
 * - Hidden bricks keep their stored content and builder bricks keep their stored position.
 * - Locked bricks keep their stored content. They can be moved, but not added or removed.
 * - Embedded bricks are only as open as the field holding them, and are kept while restricted rich text still references them.
 */
const restoreRestrictedContent = (
	access: ContentAccess,
	submitted: DocumentInput,
	stored: DocumentInput,
): DocumentInput => {
	const fields = restoreFields(submitted.fields, stored.fields, access.fields);

	const embeddedAccess = getEmbeddedBrickAccess(access, stored);
	const kept = submitted.bricks.flatMap((brick) => {
		const previous = stored.bricks.find((storedBrick) =>
			isSameBrick(storedBrick, brick),
		);
		//* stored embedded bricks follow the field holding them, so a locked or hidden parent keeps them as stored
		if (
			brick.type === "embedded" &&
			(embeddedAccess.get(brick.ref) ?? "editable") !== "editable"
		) {
			return previous ? [{ ...brick, fields: previous.fields }] : [];
		}

		const brickAccess = access.bricks.get(brick.key);
		if (!brickAccess) return [brick];
		if (brickAccess.access === "hidden" && brick.type !== "embedded") return [];

		//* every document has its fixed bricks, so a new one is kept with defaults
		if (
			brickAccess.access !== "editable" &&
			!previous &&
			brick.type !== "fixed"
		) {
			return [];
		}

		return [
			{
				...brick,
				fields: restoreFields(
					brick.fields ?? [],
					previous?.fields ?? [],
					brickAccess.fields,
				),
			},
		];
	});

	const missing = stored.bricks.filter(
		(storedBrick) => !kept.some((brick) => isSameBrick(brick, storedBrick)),
	);
	const isRestricted = (brick: BrickInputSchema) =>
		(access.bricks.get(brick.key)?.access ?? "editable") !== "editable";

	const builder = kept
		.filter((brick) => brick.type === "builder")
		.sort((a, b) => a.order - b.order);
	const restoredBuilder = stored.bricks
		.filter((brick) => brick.type === "builder")
		.sort((a, b) => a.order - b.order)
		.flatMap((brick, index) =>
			missing.includes(brick) && isRestricted(brick) ? [{ brick, index }] : [],
		);
	for (const { brick, index } of restoredBuilder) {
		builder.splice(Math.min(index, builder.length), 0, brick);
	}

	const bricks = [
		...kept.filter((brick) => brick.type !== "builder"),
		...missing.filter((brick) => brick.type === "fixed" && isRestricted(brick)),
		...(restoredBuilder.length === 0
			? builder
			: builder.map((brick, order) => ({ ...brick, order }))),
		...missing.filter((brick) => brick.type === "embedded"),
	];

	return {
		fields,
		bricks: filterReachableEmbeddedBricks({ fields, bricks }),
	};
};

export default restoreRestrictedContent;
