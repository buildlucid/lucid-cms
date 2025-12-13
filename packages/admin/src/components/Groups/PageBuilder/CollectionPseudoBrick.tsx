import { type Component, createMemo, Show } from "solid-js";
import type { CFConfig, FieldTypes, CollectionResponse } from "@types";
import brickStore, { type BrickData } from "@/store/brickStore";
import { BrickBody } from "@/components/Groups/Builder";

interface CollectionPseudoBrickProps {
	fields: CFConfig<FieldTypes>[];
	collectionMigrationStatus: CollectionResponse["migrationStatus"];
	collectionKey?: string;
	documentId?: number;
}

export const CollectionPseudoBrick: Component<CollectionPseudoBrickProps> = (
	props,
) => {
	// ------------------------------
	// Memos
	const collectionPseudoBrick = createMemo(() => {
		return brickStore.get.bricks.find((b) => b.type === "collection-fields");
	});
	const brickIndexByRef = createMemo(() => {
		const map = new Map<string, number>();
		for (let i = 0; i < brickStore.get.bricks.length; i++) {
			map.set(brickStore.get.bricks[i].ref, i);
		}
		return map;
	});
	const brickIndex = createMemo(() => {
		const ref = collectionPseudoBrick()?.ref;
		if (!ref) return -1;
		return brickIndexByRef().get(ref) ?? -1;
	});
	const fieldErrors = createMemo(() => {
		return brickStore.get.fieldsErrors;
	});
	const missingFieldColumns = createMemo(() => {
		return (
			props.collectionMigrationStatus?.missingColumns["document-fields"] || []
		);
	});

	// ----------------------------------
	// Render
	return (
		<Show when={collectionPseudoBrick() !== undefined}>
			<div class="p-4 md:p-6 border-b border-border">
				<BrickBody
					state={{
						open: true,
						brick: collectionPseudoBrick() as BrickData,
						brickIndex: brickIndex(),
						configFields: props.fields,
						fieldErrors: fieldErrors(),
						missingFieldColumns: missingFieldColumns(),
						collectionKey: props.collectionKey,
						documentId: props.documentId,
					}}
					options={{}}
				/>
			</div>
		</Show>
	);
};
