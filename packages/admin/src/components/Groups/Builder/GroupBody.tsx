import type { GroupError, InternalDocumentFieldGroup } from "@types";
import classNames from "classnames";
import { FaSolidChevronUp, FaSolidGripLines } from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createEffect,
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
import { useFieldRenderState } from "@/hooks/document/useFieldRenderState";
import brickStore from "@/store/brick-store";
import T from "@/translations/index";
import type { CollectionFieldConfigByType } from "@/types/collection-config";
import brickHelpers from "@/utils/brick-helpers";
import type { FieldConditionScope } from "@/utils/field-condition-helpers";
import helpers from "@/utils/helpers";
import { getPreviewStructureId } from "@/utils/preview-focus-dom";
import { flattenStructuralScopeConfigs } from "@/utils/structural-field-helpers";

interface GroupBodyProps {
	fieldConfig: CollectionFieldConfigByType<"repeater">;
	groupRef: string;
	groupPath: string;
	pathPrefix: Array<string | number>;
	group: Accessor<InternalDocumentFieldGroup | undefined>;
	dragDrop: DragDropCBT;
	repeaterKey: string;
	dragDropKey: string;
	groupIndex: Accessor<number>;
	repeaterDepth: number;
	parentRepeaterKey: string | undefined;
	parentRef: string | undefined;
	groupErrors: GroupError[];
	conditionScopes?: Accessor<FieldConditionScope[]>;
}

export const GroupBody: Component<GroupBodyProps> = (props) => {
	// -------------------------------
	// State & Hooks
	const fieldRenderState = useFieldRenderState();
	const [childrenMounted, setChildrenMounted] = createSignal(
		props.group()?.open === true,
	);

	// -------------------------------
	// Memos
	const group = createMemo(() => props.group());
	const ref = createMemo(() => props.groupRef);
	const groupPath = createMemo(() => props.groupPath);
	const parentRef = createMemo(() => props.parentRef);
	const parentRepeaterKey = createMemo(() => props.parentRepeaterKey);
	const repeaterKey = createMemo(() => props.repeaterKey);
	const configChildrenFields = createMemo(() => props.fieldConfig.fields);
	const nextRepeaterDepth = createMemo(() => props.repeaterDepth + 1);
	const groupFields = createMemo(() => {
		return group()?.fields || [];
	});
	const groupFieldsByKey = createMemo(() => {
		return new Map(groupFields().map((field) => [field.key, field]));
	});
	const flattenedConfigChildrenFields = createMemo(() =>
		flattenStructuralScopeConfigs(configChildrenFields() || []),
	);
	const conditionScopes = createMemo<FieldConditionScope[]>(() => [
		{
			configFields: flattenedConfigChildrenFields(),
			fields: groupFields(),
		},
		...(props.conditionScopes?.() ?? []),
	]);
	const groupOpen = createMemo(() => group()?.open === true);
	const previewTriggerId = createMemo(() =>
		getPreviewStructureId({
			brickIndex: fieldRenderState.brickIndex(),
			type: "group",
			path: props.pathPrefix,
		}),
	);
	const disabled = createMemo(
		() => props.fieldConfig.ui?.disabled || brickStore.get.locked,
	);
	const groupError = createMemo(() => {
		return props.groupErrors.find((g) => {
			return g.ref === ref();
		});
	});
	const fieldErrors = createMemo(() => {
		return groupError()?.fields;
	});
	const titlePreview = createMemo(() => {
		const firstTextConfig = flattenedConfigChildrenFields().find(
			// include textarea as it's also "text input" content
			(f) => f.type === "text" || f.type === "textarea",
		) as
			| CollectionFieldConfigByType<"text">
			| CollectionFieldConfigByType<"textarea">
			| undefined;

		if (!firstTextConfig) return "";

		const data = groupFieldsByKey().get(firstTextConfig.key);
		if (!data) return "";

		const value = brickHelpers.getFieldValue<string>({
			fieldData: data,
			// biome-ignore lint/suspicious/noExplicitAny: shared helper expects a compatible fieldConfig
			fieldConfig: firstTextConfig as any,
			contentLocale: fieldRenderState.contentLocale(),
		});

		if (typeof value !== "string") return "";

		const trimmed = value.trim();
		if (!trimmed) return "";

		// keep headers tidy (especially when nested)
		return trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
	});

	// -------------------------------
	// Effects
	createEffect(() => {
		if (groupOpen()) setChildrenMounted(true);
	});

	// -------------------------------
	// Functions
	const toggleDropdown = () => {
		brickStore.get.toggleGroupOpen({
			brickIndex: fieldRenderState.brickIndex(),
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
				"view-transition-name": `group-item-${ref()}`,
			}}
			data-dragkey={props.dragDropKey}
			class={classNames("w-full", {
				"opacity-60": props.dragDrop.getDragging()?.ref === ref(),
			})}
			onDragStart={(e) =>
				props.dragDrop.onDragStart(e, {
					ref: ref(),
					key: props.dragDropKey,
				})
			}
			onDragEnd={(e) => props.dragDrop.onDragEnd(e)}
			onDragEnter={(e) =>
				props.dragDrop.onDragEnter(e, {
					ref: ref(),
					key: props.dragDropKey,
				})
			}
			onDragOver={(e) => props.dragDrop.onDragOver(e)}
		>
			{/* Group Header */}
			{/** biome-ignore lint/a11y/useSemanticElements: explanation */}
			<div
				id={previewTriggerId()}
				data-preview-focus-open={groupOpen()}
				class={classNames(
					"w-full bg-card-base hover:bg-card-hover focus:outline-hidden focus-visible:ring-1 ring-inset ring-primary-base cursor-pointer px-3 py-3 flex justify-between items-center transition-colors duration-200",
					{
						"ring-1 ring-inset ring-primary-base":
							props.dragDrop.getDraggingTarget()?.ref === ref(),
					},
				)}
				onClick={toggleDropdown}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						toggleDropdown();
					}
				}}
				aria-expanded={groupOpen()}
				aria-controls={`accordion-content-${ref()}`}
				role="button"
				tabIndex="0"
			>
				<div class="flex items-center min-w-0 gap-2">
					<button
						type="button"
						class="text-icon-faded hover:text-primary-hover transition-colors duration-200 cursor-grab active:cursor-grabbing focus:outline-hidden focus-visible:ring-1 ring-primary-base disabled:hover:text-icon-base! disabled:opacity-50 disabled:cursor-not-allowed"
						onDragStart={(e) =>
							props.dragDrop.onDragStart(e, {
								ref: ref(),
								key: props.dragDropKey,
							})
						}
						onDragEnd={(e) => props.dragDrop.onDragEnd(e)}
						onDragEnter={(e) =>
							props.dragDrop.onDragEnter(e, {
								ref: ref(),
								key: props.dragDropKey,
							})
						}
						onDragOver={(e) => props.dragDrop.onDragOver(e)}
						aria-label={T()("common.change.order")}
						draggable={disabled() === false}
						disabled={disabled()}
					>
						<FaSolidGripLines size={14} />
					</button>
					<div class="min-w-0 flex items-center gap-2">
						<Pill theme="outline" class="shrink-0">
							#{props.groupIndex() + 1}
						</Pill>
						<h3 class="text-sm text-subtitle font-medium truncate">
							<Show when={titlePreview()}>{titlePreview()}</Show>
							<Show when={!titlePreview()}>
								{helpers.getLocaleValue({
									value: props.fieldConfig.details?.label,
								})}
							</Show>
						</h3>
					</div>
				</div>
				<div class="flex gap-0.5">
					<DeleteDebounceButton
						callback={() => {
							brickStore.get.removeRepeaterGroup({
								brickIndex: fieldRenderState.brickIndex(),
								repeaterKey: repeaterKey(),
								targetRef: ref(),
								ref: parentRef(),
								parentRepeaterKey: parentRepeaterKey(),
							});
						}}
						disabled={disabled()}
					/>
					<Button
						type="button"
						theme="secondary-subtle"
						size="icon-subtle"
						tabIndex="-1"
						classes={classNames(
							"text-icon-faded hover:text-icon-hover transition-all duration-200",
							{
								"transform rotate-180": groupOpen(),
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
						"scale-y-100 h-auto opacity-100 visible": groupOpen(),
						"scale-y-0 h-0 opacity-0 invisible": !groupOpen(),
					},
				)}
			>
				<div class="border-t border-border p-3 md:p-4 grid grid-cols-12 gap-4">
					<Index each={childrenMounted() ? configChildrenFields() : []}>
						{(config) => (
							<DynamicField
								fieldConfig={config()}
								fields={groupFields()}
								fieldsByKey={groupFieldsByKey}
								groupRef={ref()}
								groupPath={groupPath()}
								repeaterKey={repeaterKey()}
								repeaterDepth={nextRepeaterDepth()}
								pathPrefix={props.pathPrefix}
								fieldErrors={fieldErrors() || []}
								conditionScopes={conditionScopes}
							/>
						)}
					</Index>
				</div>
			</div>
		</div>
	);
};
