import type { Collection } from "@types";
import type { PreviewFieldTarget } from "@/preview/protocol";
import type { BrickData } from "@/store/brickStore/brickStore";
import type { CollectionFieldConfig } from "@/types/collection-config";
import resolveFieldAccess, {
	type FieldAccess,
} from "@/utils/resolve-field-access";

/**
 * The brick a preview target is in, with its place in the store, its field configs and what its
 * permissions allow. The document's own fields count as a brick. Null once it's gone.
 */
export const findPreviewBrick = (props: {
	target: PreviewFieldTarget;
	collection: Collection;
	bricks: BrickData[];
}): {
	brick: BrickData;
	brickIndex: number;
	configs: CollectionFieldConfig[];
	access: FieldAccess;
} | null => {
	const targetBrick = props.target.brick;
	const brickIndex = props.bricks.findIndex((brick) =>
		targetBrick
			? brick.type === targetBrick.type && brick.ref === targetBrick.ref
			: brick.type === "collection-fields",
	);
	const brick = props.bricks[brickIndex];
	if (!brick) return null;
	if (brick.type === "collection-fields") {
		return {
			brick,
			brickIndex,
			configs: props.collection.fields,
			access: "editable",
		};
	}

	const config = (
		brick.type === "fixed"
			? props.collection.fixedBricks
			: props.collection.builderBricks
	).find((item) => item.key === brick.key);
	if (!config) return null;
	return {
		brick,
		brickIndex,
		configs: config.fields,
		access: resolveFieldAccess(config.permissions),
	};
};
