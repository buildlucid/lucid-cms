import type { FieldError, InternalDocumentField } from "@types";
import classNames from "classnames";
import { FaSolidPlus } from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createMemo,
	For,
	Match,
	Show,
	Switch,
} from "solid-js";
import { ErrorMessage } from "@/components/Groups/Form";
import Button from "@/components/Partials/Button";
import DragDrop from "@/components/Partials/DragDrop";
import { FieldErrorBadge } from "@/components/Partials/FieldErrorBadge";
import RelationCount from "@/components/Partials/RelationCount";
import { useFieldRenderState } from "@/hooks/document/useFieldRenderState";
import brickStore from "@/store/brick-store";
import T from "@/translations/index";
import type { CollectionFieldConfigByType } from "@/types/collection-config";
import brickHelpers from "@/utils/brick-helpers";
import type { FieldConditionScope } from "@/utils/field-condition-helpers";
import helpers from "@/utils/helpers";
import { countFieldErrors } from "@/utils/structural-field-helpers";
import { GroupBody } from "../GroupBody";
import type { DynamicFieldRenderer } from "./types";

interface RepeaterFieldProps {
	renderField: DynamicFieldRenderer;
	fieldConfig: CollectionFieldConfigByType<"repeater">;
	fieldData?: InternalDocumentField;
	groupRef?: string;
	groupPath?: string;
	parentRepeaterKey?: string;
	repeaterDepth: number;
	fieldPath: Array<string | number>;
	fieldError: FieldError | undefined;
	conditionScopes?: Accessor<FieldConditionScope[]>;
}

export const RepeaterField: Component<RepeaterFieldProps> = (props) => {
	// -------------------------------
	// State & Hooks
	const fieldRenderState = useFieldRenderState();

	// -------------------------------
	// Memos
	const fieldConfig = createMemo(() => props.fieldConfig);
	const groups = createMemo(() => props.fieldData?.groups || []);
	const groupRefs = createMemo(() => groups().map((group) => group.ref));
	const minGroups = createMemo(() => fieldConfig().validation?.minGroups);
	const maxGroups = createMemo(() => fieldConfig().validation?.maxGroups);
	const canAddGroup = createMemo(() => {
		if (!maxGroups()) return true;
		return groups().length < (maxGroups() || 0);
	});
	const dragDropKey = createMemo(() => {
		return `${fieldConfig().key}-${props.parentRepeaterKey || ""}-${
			props.groupRef || ""
		}`;
	});
	const disabled = createMemo(
		() => !canAddGroup() || fieldConfig().ui?.disabled || brickStore.get.locked,
	);
	const groupErrors = createMemo(() => {
		return props.fieldError?.groupErrors || [];
	});
	const errorCount = createMemo(() =>
		countFieldErrors(props.fieldError ? [props.fieldError] : []),
	);
	const groupsByRef = createMemo(() => {
		return new Map(groups().map((group) => [group.ref, group]));
	});
	const fieldId = createMemo(() =>
		brickHelpers.customFieldId({
			key: fieldConfig().key,
			brickIndex: fieldRenderState.brickIndex(),
			groupRef: props.groupRef,
		}),
	);

	// -------------------------------
	// Functions
	const buildGroupPath = (index: number) => {
		if (props.groupPath) return `${props.groupPath}.${index}`;
		return `${index}`;
	};
	const addGroup = () => {
		if (!fieldConfig().fields) return;
		brickStore.get.addRepeaterGroup({
			brickIndex: fieldRenderState.brickIndex(),
			fieldConfig: fieldConfig().fields || [],
			key: fieldConfig().key,
			ref: props.groupRef,
			parentRepeaterKey: props.parentRepeaterKey,
			locales: fieldRenderState.contentLocales(),
		});
	};

	// -------------------------------
	// Render
	return (
		<fieldset
			id={fieldId()}
			class={"m-0 mb-2.5 min-w-0 w-full border-0 p-0 last:mb-0"}
			aria-labelledby={`${fieldId()}-label`}
			aria-describedby={props.fieldError ? `${fieldId()}-error` : undefined}
			aria-invalid={props.fieldError !== undefined}
		>
			<div
				class={classNames(
					"w-full overflow-hidden rounded-md border border-border bg-card-base",
					{
						"border-error-base/50": errorCount() > 0,
					},
				)}
			>
				<div
					class={classNames(
						"w-full flex items-center justify-between gap-3 bg-input-base px-3 py-2.5",
						{
							"bg-linear-to-r from-error-base/10 to-input-base":
								errorCount() > 0,
						},
					)}
				>
					<p
						id={`${fieldId()}-label`}
						data-preview-focus-label
						class="block min-w-0 text-sm font-medium text-subtitle transition-colors duration-200 ease-in-out"
					>
						{helpers.getLocaleValue({
							value: fieldConfig().details?.label,
						})}
					</p>
					<div class="flex shrink-0 items-center gap-2">
						<FieldErrorBadge count={errorCount()} />
						<Show when={minGroups() !== undefined || maxGroups() !== undefined}>
							<RelationCount
								count={groups().length}
								min={minGroups()}
								max={maxGroups()}
								class="text-body text-xs"
							/>
						</Show>
					</div>
				</div>
				{/* Repeater Body */}
				<Switch>
					<Match when={groups().length > 0}>
						<DragDrop
							sortOrder={(ref, targetRef) => {
								brickStore.get.swapGroupOrder({
									brickIndex: fieldRenderState.brickIndex(),
									repeaterKey: fieldConfig().key,
									selectedRef: ref,
									targetRef: targetRef,

									ref: props.groupRef,
									parentRepeaterKey: props.parentRepeaterKey,
								});
							}}
						>
							{({ dragDrop }) => (
								<div class="w-full border-t border-border bg-card-base divide-y divide-border">
									<For each={groupRefs()}>
										{(groupRef, i) => (
											<GroupBody
												renderField={props.renderField}
												fieldConfig={fieldConfig()}
												dragDropKey={dragDropKey()}
												groupRef={groupRef}
												groupPath={buildGroupPath(i())}
												pathPrefix={[...props.fieldPath, i()]}
												group={() => groupsByRef().get(groupRef)}
												dragDrop={dragDrop}
												repeaterKey={fieldConfig().key}
												groupIndex={i}
												repeaterDepth={props.repeaterDepth}
												parentRepeaterKey={props.parentRepeaterKey}
												parentRef={props.groupRef}
												groupErrors={groupErrors()}
												conditionScopes={props.conditionScopes}
											/>
										)}
									</For>
									<button
										type="button"
										class={classNames(
											"w-full bg-input-base hover:bg-secondary-hover transition-colors duration-200 px-3 py-2.5 flex items-center justify-center gap-2 text-sm text-body hover:text-secondary-contrast ring-inset",
											{
												"cursor-not-allowed opacity-50 hover:bg-card-base":
													disabled(),
											},
										)}
										onClick={addGroup}
										disabled={disabled()}
									>
										<FaSolidPlus size={14} />
										<span>{T()("actions.add.entry")}</span>
									</button>
								</div>
							)}
						</DragDrop>
					</Match>
					<Match when={groups().length === 0}>
						<div
							class={classNames(
								"w-full min-h-24 border-t border-dashed border-border bg-card-base p-4 dotted-background flex items-center justify-center text-center",
								{
									"opacity-50": disabled(),
								},
							)}
						>
							<Button
								type="button"
								theme="circle"
								size="icon-subtle"
								onClick={addGroup}
								disabled={disabled()}
								aria-label={T()("actions.add.entry")}
								title={T()("actions.add.entry")}
							>
								<FaSolidPlus size={12} />
							</Button>
						</div>
					</Match>
				</Switch>
			</div>
			<Show when={props.fieldError}>
				<div id={`${fieldId()}-error`} role="alert">
					<ErrorMessage id={fieldId()} errors={props.fieldError} />
				</div>
			</Show>
		</fieldset>
	);
};
