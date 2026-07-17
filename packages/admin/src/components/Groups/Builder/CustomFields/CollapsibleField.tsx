import type { FieldError, InternalDocumentField } from "@types";
import classNames from "classnames";
import { FaSolidChevronUp } from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Index,
	onMount,
	Show,
} from "solid-js";
import { DynamicField } from "@/components/Groups/Builder/CustomFields";
import { useFieldRenderState } from "@/hooks/document/useFieldRenderState";
import userPreferencesStore from "@/store/userPreferences";
import type { CollectionFieldConfigByType } from "@/types/collection-config";
import type { FieldConditionScope } from "@/utils/field-condition-helpers";
import helpers from "@/utils/helpers";
import { getPreviewStructureId } from "@/utils/preview-focus-dom";

interface CollapsibleFieldProps {
	fieldConfig: CollectionFieldConfigByType<"collapsible">;
	fields: InternalDocumentField[];
	fieldsByKey?: Accessor<Map<string, InternalDocumentField>>;
	fieldErrors: FieldError[];
	conditionScopes?: Accessor<FieldConditionScope[]>;
	groupRef?: string;
	groupPath?: string;
	repeaterKey?: string;
	repeaterDepth?: number;
	pathPrefix?: Array<string | number>;
}

export const CollapsibleField: Component<CollapsibleFieldProps> = (props) => {
	// -------------------------------
	// State & Hooks
	const fieldRenderState = useFieldRenderState();
	const [getOpen, setOpen] = createSignal<boolean>(
		props.fieldConfig.defaultOpen === true,
	);
	const [childrenMounted, setChildrenMounted] = createSignal<boolean>(
		props.fieldConfig.defaultOpen === true,
	);

	// -------------------------------
	// Memos
	const fieldConfig = createMemo(() => props.fieldConfig);
	const label = createMemo(() =>
		helpers.getLocaleValue({
			value: fieldConfig().details?.label,
		}),
	);
	const summary = createMemo(() =>
		helpers.getLocaleValue({
			value: fieldConfig().details?.summary,
		}),
	);
	const uiStateTarget = createMemo(() => {
		const collectionKey = fieldRenderState.collectionKey();
		const documentId = fieldRenderState.documentId();
		const brickRef = fieldRenderState.brickRef();

		if (
			collectionKey === undefined ||
			documentId === undefined ||
			brickRef === undefined
		) {
			return null;
		}

		return {
			brickRef,
			collectionKey,
			documentId,
			fieldKey: fieldConfig().key,
			groupPath: props.groupPath,
			groupRef: props.groupRef,
			repeaterKey: props.repeaterKey,
		};
	});
	const uiStateCollapsibleKey = createMemo(() => {
		const scope = props.groupRef
			? `group:${props.groupRef}`
			: props.groupPath
				? `path:${props.groupPath}`
				: "root";

		return [scope, props.repeaterKey, fieldConfig().key]
			.filter(Boolean)
			.join(":");
	});
	const triggerId = createMemo(() =>
		getPreviewStructureId({
			brickIndex: fieldRenderState.brickIndex(),
			type: "collapsible",
			key: fieldConfig().key,
			pathPrefix: props.pathPrefix ?? [],
		}),
	);

	// -------------------------------
	// Effects
	createEffect(() => {
		if (getOpen()) setChildrenMounted(true);
	});
	onMount(() => {
		const target = uiStateTarget();
		if (!target) return;

		const savedOpen = userPreferencesStore.getBuilderCollapsibleOpen(
			target,
			uiStateCollapsibleKey(),
		);
		if (savedOpen !== undefined) setOpen(savedOpen);
	});

	// -------------------------------
	// Functions
	const toggleOpen = () => {
		const nextOpen = !getOpen();
		setOpen(nextOpen);

		const target = uiStateTarget();
		if (!target) return;

		userPreferencesStore.setBuilderCollapsibleOpen(
			target,
			uiStateCollapsibleKey(),
			nextOpen,
		);
	};

	// -------------------------------
	// Render
	return (
		<div class="w-full border border-border rounded-md overflow-hidden">
			<button
				type="button"
				class="w-full bg-card-base hover:bg-card-hover focus:outline-hidden focus-visible:ring-1 ring-inset ring-primary-base cursor-pointer px-3 py-3 flex justify-between items-center gap-3 transition-colors duration-200 text-left"
				onClick={toggleOpen}
				id={triggerId()}
				data-preview-focus-open={getOpen()}
				aria-expanded={getOpen()}
				aria-controls={`${triggerId()}-content`}
			>
				<span class="min-w-0">
					<span class="block text-sm text-subtitle font-medium truncate">
						{label()}
					</span>
					<Show when={summary()}>
						<span class="block text-sm text-unfocused mt-0.5">{summary()}</span>
					</Show>
				</span>
				<span
					class={classNames("transition-transform duration-200 shrink-0", {
						"transform rotate-180": getOpen(),
					})}
				>
					<FaSolidChevronUp size={14} class="text-icon-faded" />
				</span>
			</button>
			<div
				id={`${triggerId()}-content`}
				class={classNames(
					"bg-background-base transform-gpu origin-top overflow-hidden w-full duration-200 transition-all",
					{
						"scale-y-100 h-auto opacity-100 visible": getOpen(),
						"scale-y-0 h-0 opacity-0 invisible": !getOpen(),
					},
				)}
			>
				<div class="border-t border-border p-3 md:p-4 grid grid-cols-12 gap-4">
					<Index each={childrenMounted() ? fieldConfig().fields : []}>
						{(config) => (
							<DynamicField
								fieldConfig={config()}
								fields={props.fields}
								fieldsByKey={props.fieldsByKey}
								fieldErrors={props.fieldErrors}
								conditionScopes={props.conditionScopes}
								groupRef={props.groupRef}
								groupPath={props.groupPath}
								repeaterKey={props.repeaterKey}
								repeaterDepth={props.repeaterDepth}
								pathPrefix={props.pathPrefix}
							/>
						)}
					</Index>
				</div>
			</div>
		</div>
	);
};
