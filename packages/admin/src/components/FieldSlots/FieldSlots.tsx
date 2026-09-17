import { fieldSlots } from "virtual:lucid-admin";
import type { InternalDocumentField } from "@lucidcms/types";
import { type Component, createMemo, For, Show } from "solid-js";
import AdminExtensionBoundary from "@/components/AdminExtensionBoundary/AdminExtensionBoundary";
import { matchesSlot } from "@/extensions/matches-slot";
import { useFieldRenderState } from "@/hooks/useFieldRenderState/useFieldRenderState";
import brickStore from "@/store/brickStore/brickStore";
import type { CollectionLeafFieldConfig } from "@/types/collection-config";
import brickHelpers from "@/utils/brick-helpers";
import { fieldSlotKeys } from "./constants";
import type { FieldSlot } from "./types";

/** Uses the current field instance, including its repeater group and content locale. */
const FieldSlots: Component<{
	slot: FieldSlot;
	config?: CollectionLeafFieldConfig;
	data?: InternalDocumentField;
}> = (props) => {
	// ----------------------------------
	// State & Hooks
	const context = useFieldRenderState();

	// ----------------------------------
	// Memos
	const contributions = createMemo(() => {
		if (!props.config) return [];
		const target = {
			collection: context.collectionKey(),
			brick: context.brickKey(),
			kind: brickStore.get.bricks[context.brickIndex()]?.type,
			field: props.config.key,
		};
		return fieldSlots.filter(
			(entry) => entry.slot === props.slot && matchesSlot(entry.match, target),
		);
	});

	// ----------------------------------
	// Render
	return (
		<Show when={props.config}>
			{(config) => (
				<For each={contributions()}>
					{(entry) => (
						<div
							class={props.slot === fieldSlotKeys.before ? "mb-2" : "mt-2"}
							data-admin-slot={entry.key}
						>
							<AdminExtensionBoundary name={entry.key}>
								<entry.component
									field={config()}
									value={brickHelpers.getFieldValue<
										InternalDocumentField["value"]
									>({
										fieldConfig: config(),
										fieldData: props.data,
										contentLocale: context.contentLocale(),
									})}
									contentLocale={context.contentLocale()}
								/>
							</AdminExtensionBoundary>
						</div>
					)}
				</For>
			)}
		</Show>
	);
};

export default FieldSlots;
