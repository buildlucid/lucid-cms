import constants from "../../../constants/constants.js";
import type CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import type { BrickSchema } from "../../../schemas/collection-bricks.js";
import type { FieldSchemaType } from "../../../schemas/collection-fields.js";
import type { Config } from "../../../types.js";
import flattenFields, {
	type GroupInsertItem,
	type FieldInsertItem,
} from "./flatten-fields.js";

export interface BrickInsertItem extends BrickSchema {
	id: number | string;
	fields: Array<FieldInsertItem>;
	groups: Array<GroupInsertItem>;
}

const formatInsertBricks = (props: {
	bricks?: Array<BrickSchema>;
	fields?: Array<FieldSchemaType>;
	localisation: Config["localisation"];
	collection: CollectionBuilder;
}): Array<BrickInsertItem> => {
	const bricksRes: Array<BrickInsertItem> = [];

	if (props.bricks !== undefined) {
		for (let i = 0; i < props.bricks.length; i++) {
			const brick = props.bricks[i];
			if (brick === undefined) continue;

			const flat = flattenFields(
				brick.fields ?? [],
				props.localisation,
				props.collection,
			);

			bricksRes.push({
				id: brick.id,
				key: brick.key,
				order: brick.order,
				type: brick.type,
				open: brick.open,
				fields: flat.fields,
				groups: flat.groups,
			});
		}
	}

	if (props.fields !== undefined) {
		const flat = flattenFields(
			props.fields,
			props.localisation,
			props.collection,
		);
		bricksRes.push({
			id: "collection-pseudo-brick",
			type: constants.brickTypes.collectionFields,
			fields: flat.fields,
			groups: flat.groups,
		});
	}

	return bricksRes;
};

export default formatInsertBricks;
