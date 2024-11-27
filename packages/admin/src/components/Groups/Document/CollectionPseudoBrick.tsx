import { type Component, createMemo, Show } from "solid-js";
import type { CFConfig, FieldTypes } from "@lucidcms/core/types";
import brickStore, { type BrickData } from "@/store/brickStore";
import Builder from "@/components/Groups/Builder";

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
			(brick) => brick.id === collectionPseudoBrick()?.id,
		);
	});

	// ----------------------------------
	// Render
	return (
		<Show when={collectionPseudoBrick() !== undefined}>
			<div class="px-15 md:px-30 py-15 md:py-30  border-b border-border">
				<Builder.BrickBody
					state={{
						open: true,
						brick: collectionPseudoBrick() as BrickData,
						brickIndex: brickIndex(),
						configFields: props.fields,
					}}
					options={{}}
				/>
			</div>
		</Show>
	);
};
