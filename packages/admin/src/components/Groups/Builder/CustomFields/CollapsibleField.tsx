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
import type { CollectionFieldConfigByType } from "@/types/collection-config";
import { builderUiStateHelpers } from "@/utils/builder-ui-state-helpers";
import type { FieldConditionScope } from "@/utils/field-condition-helpers";
import helpers from "@/utils/helpers";

interface CollapsibleFieldProps {
	state: {
		fieldConfig: CollectionFieldConfigByType<"collapsible">;
		fields: InternalDocumentField[];
		fieldsByKey?: Accessor<Map<string, InternalDocumentField>>;
		fieldErrors: FieldError[];
		conditionScopes?: Accessor<FieldConditionScope[]>;

		groupRef?: string;
		groupPath?: string;
		repeaterKey?: string;
		repeaterDepth?: number;
	};
}

export const CollapsibleField: Component<CollapsibleFieldProps> = (props) => {
	// -------------------------------
	// State & Hooks
	const fieldRenderState = useFieldRenderState();
	const [getOpen, setOpen] = createSignal<boolean>(
		props.state.fieldConfig.defaultOpen === true,
	);
	const [childrenMounted, setChildrenMounted] = createSignal<boolean>(
		props.state.fieldConfig.defaultOpen === true,
	);

	// -------------------------------
	// Memos
	const fieldConfig = createMemo(() => props.state.fieldConfig);
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
		const brickKey = fieldRenderState.uiStateBrickKey();
		const brickOrder = fieldRenderState.brickOrder();

		if (
			collectionKey === undefined ||
			documentId === undefined ||
			brickKey === undefined ||
			brickOrder === undefined
		) {
			return null;
		}

		return {
			brickKey,
			brickOrder,
			collectionKey,
			documentId,
			fieldKey: fieldConfig().key,
			groupPath: props.state.groupPath,
			groupRef: props.state.groupRef,
			repeaterKey: props.state.repeaterKey,
		};
	});

	// -------------------------------
	// Effects
	createEffect(() => {
		if (getOpen()) setChildrenMounted(true);
	});

	onMount(() => {
		const target = uiStateTarget();
		if (!target) return;

		const savedOpen = builderUiStateHelpers.getCollapsibleOpen(
			target.collectionKey,
			target.documentId,
			target.brickKey,
			target.brickOrder,
			target,
		);
		if (savedOpen !== null) setOpen(savedOpen);
	});

	// -------------------------------
	// Functions
	const toggleOpen = () => {
		const nextOpen = !getOpen();
		setOpen(nextOpen);

		const target = uiStateTarget();
		if (!target) return;

		builderUiStateHelpers.setCollapsibleOpen(
			target.collectionKey,
			target.documentId,
			target.brickKey,
			target.brickOrder,
			target,
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
				id={`collapsible-header-${fieldConfig().key}`}
				aria-expanded={getOpen()}
				aria-controls={`collapsible-content-${fieldConfig().key}`}
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
				id={`collapsible-content-${fieldConfig().key}`}
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
								state={{
									fieldConfig: config(),
									fields: props.state.fields,
									fieldsByKey: props.state.fieldsByKey,
									fieldErrors: props.state.fieldErrors,
									conditionScopes: props.state.conditionScopes,
									groupRef: props.state.groupRef,
									groupPath: props.state.groupPath,
									repeaterKey: props.state.repeaterKey,
									repeaterDepth: props.state.repeaterDepth,
								}}
							/>
						)}
					</Index>
				</div>
			</div>
		</div>
	);
};
