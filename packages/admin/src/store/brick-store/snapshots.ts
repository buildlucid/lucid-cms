import type { InternalDocumentField } from "@types";

type BrickSnapshotSource = {
	ref: string;
	key: string;
	order: number;
	type: "builder" | "fixed" | "collection-fields";
	fields: Array<InternalDocumentField>;
};

export type BrickSnapshot = BrickSnapshotSource;

/** Clones persisted brick data so later mutations cannot alter the saved baseline. */
const createBrickSnapshot = (brick: BrickSnapshotSource): BrickSnapshot => ({
	ref: brick.ref,
	key: brick.key,
	order: brick.order,
	type: brick.type,
	fields: JSON.parse(JSON.stringify(brick.fields)),
});

/** Captures every brick in one canonical array for save and dirty-state comparisons. */
export const createBricksSnapshot = (
	bricks: BrickSnapshotSource[],
): BrickSnapshot[] => bricks.map(createBrickSnapshot);

/** Normalizes UI-only repeater state before comparing document content. */
const normalizeGroupOpenState = (
	fields: InternalDocumentField[],
): InternalDocumentField[] =>
	fields.map((field) => ({
		...field,
		...(field.groups
			? {
					groups: field.groups.map((group) => ({
						...group,
						open: false,
						fields: normalizeGroupOpenState(group.fields),
					})),
				}
			: {}),
	}));

/** Creates a content comparison that ignores whether groups are expanded. */
export const createContentComparisonSnapshot = (snapshots: BrickSnapshot[]) =>
	snapshots.map((snapshot) => ({
		...snapshot,
		fields: normalizeGroupOpenState(snapshot.fields),
	}));

/** Captures the persisted builder identity used by preview field targets. */
export const createBuilderBrickStructureSnapshot = (
	bricks: Array<Pick<BrickSnapshot, "key" | "order" | "type">>,
) =>
	bricks
		.filter((brick) => brick.type === "builder")
		.map((brick) => ({ key: brick.key, order: brick.order }));
