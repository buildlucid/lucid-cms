import { brickSlots } from "virtual:lucid-admin";
import { type Component, createMemo, For, Show } from "solid-js";
import { matchesSlot } from "@/extensions/matches-slot";
import type { BrickData } from "@/store/brickStore/brickStore";
import AdminExtensionBoundary from "../AdminExtensionBoundary/AdminExtensionBoundary";
import type { BrickSlot, BrickSlotProps } from "./types";

const BrickSlots: Component<{
	slot: BrickSlot;
	config?: BrickSlotProps["brick"];
	brick: BrickData;
	collectionKey?: string;
	contentLocale: string;
}> = (props) => {
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

	// ----------------------------------
	// Render
	return (
		<Show when={props.config}>
			{(config) => (
				<For each={contributions()}>
					{(entry) => (
						<div class="col-span-12" data-admin-slot={entry.key}>
							<AdminExtensionBoundary name={entry.key}>
								<entry.component
									brick={config()}
									fields={props.brick.fields}
									contentLocale={props.contentLocale}
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
