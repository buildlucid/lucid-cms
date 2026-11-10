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
import { brickSlots } from "virtual:lucid-admin";
import { createFieldScope } from "@/extensions/editor/field-scope";
import type { EditorBrick } from "@/extensions/editor/types";
import { matchSlots } from "@/extensions/match-slots";
import { useBrickStore } from "@/hooks/useBrickStore/useBrickStore";
import {
	useFieldEnvironment,
	useFieldScope,
} from "@/hooks/useFieldScope/useFieldScope";
import type { BrickData } from "@/store/brickStore/brickStore";
import type { CollectionBrickConfig } from "@/types/collection-config";
import hasRenderedContent from "@/utils/has-rendered-content";
import resolveFieldAccess from "@/utils/resolve-field-access";
import AdminExtensionBoundary from "../AdminExtensionBoundary/AdminExtensionBoundary";
import type { BrickSlot } from "./types";

/** Places matching extensions around the native fields, sharing one optional side panel. */
const BrickSlots: Component<{
	children?: JSX.Element;
	open: boolean;
	header?: boolean;
	/** Extra classes for each header slot, for aligning with the header's own actions. */
	headerClass?: string;
	config?: CollectionBrickConfig;
	errors?: FieldError[];
	brick: BrickData;
	collectionKey?: string;
	contentLocale: string;
}> = (props) => {
	// ----------------------------------
	// State & Hooks
	const brickStore = useBrickStore();
	//* inside a brick body, its fields share the body's level; brick headers build their own
	const fields =
		useFieldScope()?.scope ??
		createFieldScope(
			useFieldEnvironment({
				contentLocale: () => props.contentLocale,
				collectionKey: () => props.collectionKey,
			}),
			{
				brickIndex: () =>
					brickStore.get.bricks.findIndex(
						(brick) => brick.ref === props.brick.ref,
					),
				configs: () => props.config?.fields ?? [],
				fields: () => props.brick.fields,
				errors: () => props.errors,
				access: () => resolveFieldAccess(props.config?.permissions),
			},
		);

	// ----------------------------------
	// Memos
	const contributions = createMemo(() => {
		if (!props.config || props.brick.type === "collection-fields") return [];
		const target = {
			collection: props.collectionKey,
			brick: props.brick.key,
			kind: props.brick.type,
		};
		return matchSlots(brickSlots, target);
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
	const brick = createMemo((): EditorBrick | undefined => {
		if (!props.config || props.brick.type === "collection-fields") {
			return undefined;
		}

		return {
			key: props.brick.key,
			ref: props.brick.ref,
			kind: props.brick.type,
			config: props.config,
			fields,
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
									key={entry.key}
									options={entry.options}
									open={props.open}
									brick={brick()}
								/>
							</AdminExtensionBoundary>
						));
						return (
							<Show when={hasRenderedContent(content.toArray())}>
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
