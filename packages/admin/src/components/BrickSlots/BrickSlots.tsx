import { brickSlots } from "virtual:lucid-admin";
import type { FieldError } from "@types";
import classNames from "classnames";
import {
	type Component,
	children,
	createMemo,
	For,
	type JSX,
	Show,
} from "solid-js";
import { createFieldStates } from "@/extensions/editor/field-state";
import { resolveSlots } from "@/extensions/slot-policy";
import { useDocumentRoute } from "@/hooks/useDocumentRoute/useDocumentRoute";

import type { BrickData } from "@/store/brickStore/brickStore";
import brickStore from "@/store/brickStore/brickStore";
import type { CollectionBrickConfig } from "@/types/collection-config";
import AdminExtensionBoundary from "../AdminExtensionBoundary/AdminExtensionBoundary";
import type { BrickSlot } from "./types";

/** Places matching extensions around the native fields, sharing one optional side panel. */
const BrickSlots: Component<{
	children?: JSX.Element;
	open: boolean;
	header?: boolean;
	/** Extra classes for each header slot, for aligning with the header's own actions. */
	headerClass?: string;
	documentId?: number;
	config?: CollectionBrickConfig;
	errors?: FieldError[];
	brick: BrickData;
	collectionKey?: string;
	contentLocale: string;
}> = (props) => {
	// ----------------------------------
	// State & Hooks
	const route = useDocumentRoute(() => props.contentLocale);

	// ----------------------------------
	// Memos
	const contributions = createMemo(() => {
		if (!props.config || props.brick.type === "collection-fields") return [];
		const target = {
			collection: props.collectionKey,
			brick: props.brick.key,
			kind: props.brick.type,
		};
		return resolveSlots(brickSlots, target);
	});
	const sidePanel = createMemo(() =>
		contributions().find(
			(
				entry,
			): entry is Extract<
				typeof entry,
				{ slot: "brick.start" | "brick.end" }
			> => entry.slot === "brick.start" || entry.slot === "brick.end",
		),
	);
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
	const renderSlots = (slot: BrickSlot) => (
		<Show when={brick()}>
			{(brick) => (
				<For each={contributions().filter((entry) => entry.slot === slot)}>
					{(entry) => {
						const content = children(() => (
							<AdminExtensionBoundary
								name={entry.key}
								placement={props.header ? "header" : "content"}
							>
								<entry.component
									slot={slot}
									options={entry.options}
									open={props.open}
									brick={brick()}
									context={{
										route: route(),
										collectionKey: props.collectionKey,
										documentId: props.documentId,
										contentLocale: props.contentLocale,
										readOnly: brickStore.get.locked,
									}}
								/>
							</AdminExtensionBoundary>
						));
						return (
							<Show when={content.toArray().length > 0}>
								<div
									class={
										props.header
											? classNames("min-w-0", props.headerClass)
											: "col-span-12"
									}
									data-admin-slot={entry.key}
								>
									{content()}
								</div>
							</Show>
						);
					}}
				</For>
			)}
		</Show>
	);

	return (
		<Show when={!props.header} fallback={renderSlots("brick.header")}>
			<div class="@container/brick min-w-0">
				<div
					class="grid grid-cols-12 items-start gap-x-6 gap-y-3"
					style={{
						"--brick-panel-width": sidePanel()?.width ?? 6,
						"--brick-fields-width": 12 - (sidePanel()?.width ?? 6),
					}}
				>
					<div
						class="col-span-12 min-w-0 space-y-4"
						classList={{
							"@min-[48rem]/brick:col-span-[var(--brick-fields-width)]":
								!!sidePanel(),
							"@min-[48rem]/brick:order-2": sidePanel()?.slot === "brick.start",
						}}
					>
						{renderSlots("brick.beforeFields")}
						{props.children}
						{renderSlots("brick.afterFields")}
					</div>
					<Show when={sidePanel()}>
						{(panel) => (
							<div
								class="col-span-12 min-w-0 space-y-4 @min-[48rem]/brick:col-span-(--brick-panel-width)"
								classList={{
									"@min-[48rem]/brick:sticky @min-[48rem]/brick:top-[calc(var(--document-header-bar-height,0px)+2rem)]":
										panel().sticky,
								}}
							>
								{renderSlots(panel().slot)}
							</div>
						)}
					</Show>
				</div>
			</div>
		</Show>
	);
};

export default BrickSlots;
