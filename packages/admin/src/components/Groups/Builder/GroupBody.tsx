import T from "@/translations/index";
import { type Component, Index, createMemo, createSignal } from "solid-js";
import type { DragDropCBT } from "@/components/Partials/DragDrop";
import type { CFConfig, FieldGroupResponse, GroupError } from "@types";
import classNames from "classnames";
import { FaSolidGripLines, FaSolidCircleChevronUp } from "solid-icons/fa";
import brickStore from "@/store/brickStore";
import { DynamicField } from "@/components/Groups/Builder/CustomFields";
import DeleteDebounceButton from "@/components/Partials/DeleteDebounceButton";
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
		<div
			style={{
				"view-transition-name": `group-item-${props.state.group.ref}`,
			}}
			data-dragkey={props.state.dragDropKey}
			class={classNames("w-full mb-2.5 last:mb-0", {
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
			<div
				class={classNames(
					"w-full bg-input-base focus:outline-hidden focus-visible:ring-1 ring-inset ring-primary-base cursor-pointer p-2.5 rounded-md border border-border flex justify-between items-center",
					{
						"border-b-0 rounded-b-none": getGroupOpen(),
						"ring-1 ring-inset":
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
				// biome-ignore lint/a11y/useSemanticElements: <explanation>
				role="button"
				tabIndex="0"
			>
				<div class="flex items-center">
					<button
						type="button"
						class="text-icon-base mr-2 hover:text-primary-hover transition-colors duration-200 cursor-pointer focus:outline-hidden focus-visible:ring-1 ring-primary-base disabled:hover:text-icon-base! disabled:opacity-50 disabled:cursor-not-allowed"
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
						<FaSolidGripLines class="w-4" />
					</button>
					<h3 class="text-sm text-body">
						{helpers.getLocaleValue({
							value: props.state.fieldConfig.details?.label,
						})}
						-{props.state.groupIndex + 1}
					</h3>
				</div>
				<div class="flex gap-2">
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
					<button
						type="button"
						class={classNames(
							"text-2xl text-icon-base hover:text-icon-hover transition-all duration-200",
							{
								"transform rotate-180": getGroupOpen(),
							},
						)}
						tabIndex="-1"
					>
						<FaSolidCircleChevronUp size={16} />
					</button>
				</div>
			</div>
			{/* Group Body */}
			<div
				class={classNames(
					"border-border bg-[#181818] transform-gpu origin-top border-x border-b mb-2.5 last:mb-0 rounded-b-md overflow-hidden w-full duration-200 transition-all",
					{
						"bg-background-base": props.state.repeaterDepth % 2 !== 0,
						"scale-y-100 h-auto opacity-100 visible": getGroupOpen(),
						"scale-y-0 h-0 opacity-0 invisible": !getGroupOpen(),
					},
				)}
				aria-labelledby={`accordion-header-${ref()}`}
			>
				<div class="p-4">
					<Index each={configChildrenFields()}>
						{(config, index) => (
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
