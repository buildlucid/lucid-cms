import { brickSlots } from "virtual:lucid-admin";
import type { FieldError } from "@types";
import { type Component, createMemo, For, Show } from "solid-js";
import { createFieldStates } from "@/extensions/editor/field-state";
import { matchesSlot } from "@/extensions/matches-slot";
import { useFieldRenderState } from "@/hooks/useFieldRenderState/useFieldRenderState";
import type { BrickData } from "@/store/brickStore/brickStore";
import brickStore from "@/store/brickStore/brickStore";
import type { CollectionBrickConfig } from "@/types/collection-config";
import AdminExtensionBoundary from "../AdminExtensionBoundary/AdminExtensionBoundary";
import type { BrickSlot } from "./types";

const BrickSlots: Component<{
	slot: BrickSlot;
	config?: CollectionBrickConfig;
	errors?: FieldError[];
	brick: BrickData;
	collectionKey?: string;
	contentLocale: string;
}> = (props) => {
	// ----------------------------------
	// State & Hooks
	const context = useFieldRenderState();

	// ----------------------------------
	// Memos
	const contributions = createMemo(() => {
		if (!props.config || props.brick.type === "collection-fields") return [];
		const target = {
			collection: props.collectionKey,
			brick: props.brick.key,
			kind: props.brick.type,
		};
		return brickSlots.filter(
			(entry) => entry.slot === props.slot && matchesSlot(entry.match, target),
		);
	});
	const brick = createMemo(() => {
		if (!props.config || props.brick.type === "collection-fields") {
			return undefined;
		}

		return {
			key: props.brick.key,
			ref: props.brick.ref,
			kind: props.brick.type,
			config: props.config,
			fields: createFieldStates({
				configs: props.config.fields,
				fields: props.brick.fields,
				errors: props.errors,
				contentLocale: props.contentLocale,
				localized: brickStore.get.collectionLocalized,
				readOnly: brickStore.get.locked,
			}),
		};
	});

	// ----------------------------------
	// Render
	return (
		<Show when={brick()}>
			{(brick) => (
				<For each={contributions()}>
					{(entry) => (
						<div class="col-span-12" data-admin-slot={entry.key}>
							<AdminExtensionBoundary name={entry.key}>
								<entry.component
									slot={props.slot}
									brick={brick()}
									context={{
										collectionKey: props.collectionKey,
										documentId: context.documentId(),
										contentLocale: props.contentLocale,
										readOnly: brickStore.get.locked,
									}}
								/>
							</AdminExtensionBoundary>
						</div>
					)}
				</For>
			)}
		</Show>
	);
};

export default BrickSlots;
