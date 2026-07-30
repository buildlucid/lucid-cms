import type { FieldError, InternalDocumentField } from "@types";
import classNames from "classnames";
import { FaSolidChevronDown } from "solid-icons/fa";
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
import { FieldErrorBadge } from "@/components/Partials/FieldErrorBadge";
import { useFieldRenderState } from "@/hooks/document/useFieldRenderState";
import userPreferencesStore from "@/store/user-preferences";
import type { CollectionFieldConfigByType } from "@/types/collection-config";
import type { FieldConditionScope } from "@/utils/field-condition-helpers";
import helpers from "@/utils/helpers";
import { getPreviewStructureId } from "@/utils/preview-focus-dom";
import {
	countFieldErrorsForKeys,
	getStructuralFieldKeys,
} from "@/utils/structural-field-helpers";

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
	const structuralFieldKeys = createMemo(() =>
		getStructuralFieldKeys(fieldConfig().fields),
	);
	const errorCount = createMemo(() =>
		countFieldErrorsForKeys(props.fieldErrors, structuralFieldKeys()),
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
		<div
			class={classNames(
				"w-full overflow-hidden rounded-md border border-border bg-card-base",
				{
					"border-error-base/50": errorCount() > 0,
				},
			)}
			aria-invalid={errorCount() > 0}
		>
			<button
				type="button"
				class={classNames(
					"w-full cursor-pointer bg-input-base px-3 py-2.5 text-left transition-colors duration-200 hover:bg-card-hover focus:outline-hidden focus-visible:ring-1 ring-inset ring-primary-base flex justify-between items-center gap-3",
					{
						"bg-linear-to-r from-error-base/10 to-input-base": errorCount() > 0,
					},
				)}
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
				<span class="flex shrink-0 items-center gap-2">
					<FieldErrorBadge count={errorCount()} />
					<FaSolidChevronDown
						size={12}
						class={classNames(
							"shrink-0 text-icon-faded transition-transform duration-200",
							{
								"rotate-180": getOpen(),
							},
						)}
					/>
				</span>
			</button>
			<div
				id={`${triggerId()}-content`}
				class={classNames(
					"bg-card-base transform-gpu origin-top overflow-hidden w-full duration-200 transition-all",
					{
						"scale-y-100 h-auto opacity-100 visible": getOpen(),
						"scale-y-0 h-0 opacity-0 invisible": !getOpen(),
					},
				)}
			>
				<div class="border-t border-border bg-card-base p-3 md:p-4 grid grid-cols-12 gap-4">
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
