import { type Component, createMemo, Show } from "solid-js";
import type { CFConfig, FieldTypes } from "@types";
import brickStore, { type BrickData } from "@/store/brickStore";
import { BrickBody } from "@/components/Groups/Builder";

interface CollectionPseudoBrickProps {
	fields: CFConfig<FieldTypes>[];
}

export const CollectionPseudoBrick: Component<CollectionPseudoBrickProps> = (
	props,
) => {
	// ------------------------------
	// Memos
	const collectionPseudoBrick = createMemo(() => {
		const bricks = brickStore.get.bricks.filter(
			(b) => b.type === "collection-fields",
		);
		return bricks.length > 0 ? bricks[0] : undefined;
	});
	const brickIndex = createMemo(() => {
		return brickStore.get.bricks.findIndex(
			(brick) => brick.ref === collectionPseudoBrick()?.ref,
		);
	});
	const fieldErrors = createMemo(() => {
		return brickStore.get.fieldsErrors;
	});

	// ----------------------------------
	// Render
	return (
		<Show when={collectionPseudoBrick() !== undefined}>
			<div class="p-5  border-b border-border">
				<BrickBody
					state={{
						open: true,
						brick: collectionPseudoBrick() as BrickData,
						brickIndex: brickIndex(),
						configFields: props.fields,
						fieldErrors: fieldErrors(),
					}}
					options={{}}
				/>
			</div>
		</Show>
	);
};
