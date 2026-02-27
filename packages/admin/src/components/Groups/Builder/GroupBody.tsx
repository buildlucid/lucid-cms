import type { CFConfig, FieldGroupResponse, GroupError } from "@types";
import classNames from "classnames";
import { FaSolidChevronUp, FaSolidGripLines } from "solid-icons/fa";
import {
	type Component,
	createMemo,
	createSignal,
	Index,
	Show,
} from "solid-js";
import { DynamicField } from "@/components/Groups/Builder/CustomFields";
import Button from "@/components/Partials/Button";
import DeleteDebounceButton from "@/components/Partials/DeleteDebounceButton";
import type { DragDropCBT } from "@/components/Partials/DragDrop";
import Pill from "@/components/Partials/Pill";
import brickStore from "@/store/brickStore";
import contentLocaleStore from "@/store/contentLocaleStore";
import T from "@/translations/index";
import brickHelpers from "@/utils/brick-helpers";
import helpers from "@/utils/helpers";

interface GroupBodyProps {
	state: {
		brickIndex: number;
		fieldConfig: CFConfig<"repeater">;
		group: FieldGroupResponse;
		dragDrop: DragDropCBT;
		repeaterKey: string;
		dragDropKey: string;
		groupIndex: number;
		repeaterDepth: number;
		parentRepeaterKey: string | undefined;
		parentRef: string | undefined;
		groupErrors: GroupError[];
		missingFieldColumns: string[];
	};
}

export const GroupBody: Component<GroupBodyProps> = (props) => {
	// -------------------------------
	// State
	const [getGroupOpen, setGroupOpen] = createSignal(!!props.state.group.open);

	// -------------------------------
	// Memos
	const ref = createMemo(() => props.state.group.ref);
	const brickIndex = createMemo(() => props.state.brickIndex);
	const parentRef = createMemo(() => props.state.parentRef);
	const parentRepeaterKey = createMemo(() => props.state.parentRepeaterKey);
	const repeaterKey = createMemo(() => props.state.repeaterKey);
	const configChildrenFields = createMemo(() => props.state.fieldConfig.fields);
	const nextRepeaterDepth = createMemo(() => props.state.repeaterDepth + 1);
	const groupFields = createMemo(() => {
		return props.state.group.fields;
	});
	const contentLocale = createMemo(
		() => contentLocaleStore.get.contentLocale ?? "",
	);
	const isDisabled = createMemo(
		() => props.state.fieldConfig.config.isDisabled || brickStore.get.locked,
	);
	const groupError = createMemo(() => {
		return props.state.groupErrors.find((g) => {
			return g.ref === props.state.group.ref;
		});
	});
	const fieldErrors = createMemo(() => {
		return groupError()?.fields;
	});
	const missingFieldColumns = createMemo(() => props.state.missingFieldColumns);
	const titlePreview = createMemo(() => {
		const configs = configChildrenFields() || [];
		const firstTextConfig = configs.find(
			// include textarea as it's also "text input" content
			(f) => f.type === "text" || f.type === "textarea",
		) as CFConfig<"text"> | CFConfig<"textarea"> | undefined;

		if (!firstTextConfig) return "";

		const data = groupFields()?.find((f) => f.key === firstTextConfig.key);
		if (!data) return "";

		const value = brickHelpers.getFieldValue<string>({
			fieldData: data,
			// biome-ignore lint/suspicious/noExplicitAny: shared helper expects a compatible fieldConfig
			fieldConfig: firstTextConfig as any,
			contentLocale: contentLocale(),
		});

		if (typeof value !== "string") return "";

		const trimmed = value.trim();
		if (!trimmed) return "";

		// keep headers tidy (especially when nested)
		return trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
	});

	// -------------------------------
	// Functions
	const toggleDropdown = () => {
		setGroupOpen(!getGroupOpen());
		brickStore.get.toggleGroupOpen({
			brickIndex: brickIndex(),
			repeaterKey: repeaterKey(),
			ref: ref(),
			parentRef: parentRef(),
			parentRepeaterKey: parentRepeaterKey(),
		});
	};

	// -------------------------------
	// Render
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: explanation
		<div
			style={{
				"view-transition-name": `group-item-${props.state.group.ref}`,
			}}
			data-dragkey={props.state.dragDropKey}
			class={classNames("w-full", {
				"opacity-60": props.state.dragDrop.getDragging()?.ref === ref(),
			})}
			onDragStart={(e) =>
				props.state.dragDrop.onDragStart(e, {
					ref: ref(),
					key: props.state.dragDropKey,
				})
			}
			onDragEnd={(e) => props.state.dragDrop.onDragEnd(e)}
			onDragEnter={(e) =>
				props.state.dragDrop.onDragEnter(e, {
					ref: ref(),
					key: props.state.dragDropKey,
				})
			}
			onDragOver={(e) => props.state.dragDrop.onDragOver(e)}
		>
			{/* Group Header */}
			{/** biome-ignore lint/a11y/useSemanticElements: explanation */}
			<div
				class={classNames(
					"w-full bg-card-base hover:bg-card-hover focus:outline-hidden focus-visible:ring-1 ring-inset ring-primary-base cursor-pointer px-3 py-3 flex justify-between items-center transition-colors duration-200",
					{
						"ring-1 ring-inset ring-primary-base":
							props.state.dragDrop.getDraggingTarget()?.ref === ref(),
					},
				)}
				onClick={toggleDropdown}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						toggleDropdown();
					}
				}}
				id={`accordion-header-${ref()}`}
				aria-expanded={getGroupOpen()}
				aria-controls={`accordion-content-${ref()}`}
				role="button"
				tabIndex="0"
			>
				<div class="flex items-center min-w-0 gap-2">
					<button
						type="button"
						class="text-icon-faded hover:text-primary-hover transition-colors duration-200 cursor-grab active:cursor-grabbing focus:outline-hidden focus-visible:ring-1 ring-primary-base disabled:hover:text-icon-base! disabled:opacity-50 disabled:cursor-not-allowed"
						onDragStart={(e) =>
							props.state.dragDrop.onDragStart(e, {
								ref: ref(),
								key: props.state.dragDropKey,
							})
						}
						onDragEnd={(e) => props.state.dragDrop.onDragEnd(e)}
						onDragEnter={(e) =>
							props.state.dragDrop.onDragEnter(e, {
								ref: ref(),
								key: props.state.dragDropKey,
							})
						}
						onDragOver={(e) => props.state.dragDrop.onDragOver(e)}
						aria-label={T()("change_order")}
						draggable={isDisabled() === false}
						disabled={isDisabled()}
					>
						<FaSolidGripLines size={14} />
					</button>
					<div class="min-w-0 flex items-center gap-2">
						<Pill theme="outline" class="shrink-0">
							#{props.state.groupIndex + 1}
						</Pill>
						<h3 class="text-sm text-subtitle font-medium truncate">
							<Show when={titlePreview()}>{titlePreview()}</Show>
							<Show when={!titlePreview()}>
								{helpers.getLocaleValue({
									value: props.state.fieldConfig.details?.label,
								})}
							</Show>
						</h3>
					</div>
				</div>
				<div class="flex gap-0.5">
					<DeleteDebounceButton
						callback={() => {
							brickStore.get.removeRepeaterGroup({
								brickIndex: brickIndex(),
								repeaterKey: repeaterKey(),
								targetRef: ref(),
								ref: parentRef(),
								parentRepeaterKey: parentRepeaterKey(),
							});
						}}
						disabled={isDisabled()}
					/>
					<Button
						type="button"
						theme="secondary-subtle"
						size="icon-subtle"
						tabIndex="-1"
						classes={classNames(
							"text-icon-faded hover:text-icon-hover transition-all duration-200",
							{
								"transform rotate-180": getGroupOpen(),
							},
						)}
					>
						<FaSolidChevronUp size={14} />
					</Button>
				</div>
			</div>
			{/* Group Body */}
			<div
				class={classNames(
					"bg-background-base transform-gpu origin-top overflow-hidden w-full duration-200 transition-all",
					{
						"scale-y-100 h-auto opacity-100 visible": getGroupOpen(),
						"scale-y-0 h-0 opacity-0 invisible": !getGroupOpen(),
					},
				)}
			>
				<div class="border-t border-border p-3 md:p-4 gap-4 flex flex-col">
					<Index each={configChildrenFields()}>
						{(config) => (
							<DynamicField
								state={{
									brickIndex: brickIndex(),
									fieldConfig: config(),
									fields: groupFields(),
									groupRef: ref(),
									repeaterKey: repeaterKey(),
									repeaterDepth: nextRepeaterDepth(),
									fieldErrors: fieldErrors() || [],
									missingFieldColumns: missingFieldColumns(),
								}}
							/>
						)}
					</Index>
				</div>
			</div>
		</div>
	);
};
