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
import { GroupBody } from "@/components/Groups/Builder";
import DragDrop from "@/components/Partials/DragDrop";
import RelationCount from "@/components/Partials/RelationCount";
import { useFieldRenderState } from "@/hooks/document/useFieldRenderState";
import brickStore from "@/store/brickStore";
import T from "@/translations/index";
import type { CollectionFieldConfigByType } from "@/types/collection-config";
import type { FieldConditionScope } from "@/utils/field-condition-helpers";
import helpers from "@/utils/helpers";

interface RepeaterFieldProps {
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
	const groupsByRef = createMemo(() => {
		return new Map(groups().map((group) => [group.ref, group]));
	});
	const buildGroupPath = (index: number) => {
		if (props.groupPath) return `${props.groupPath}.${index}`;
		return `${index}`;
	};

	// -------------------------------
	// Functions
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
		<div class={"mb-2.5 last:mb-0 w-full"}>
			<div class={"w-full"}>
				<div class="w-full flex items-center justify-between gap-3 mb-1.5">
					<p
						data-preview-focus-label
						class="block text-sm transition-colors duration-200 ease-in-out text-body"
					>
						{helpers.getLocaleValue({
							value: fieldConfig().details?.label,
						})}
					</p>
					<Show when={minGroups() !== undefined || maxGroups() !== undefined}>
						<RelationCount
							count={groups().length}
							min={minGroups()}
							max={maxGroups()}
							class="text-body text-xs"
						/>
					</Show>
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
								<div class="w-full border border-border rounded-md overflow-hidden divide-y divide-border">
									<For each={groupRefs()}>
										{(groupRef, i) => (
											<GroupBody
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
											"w-full bg-input-base hover:border-transparent hover:bg-secondary-hover transition-colors duration-200 px-3 py-3 flex items-center justify-center text-sm text-body hover:text-secondary-contrast ring-inset",
											{
												"cursor-not-allowed opacity-50 hover:bg-card-base":
													disabled(),
											},
										)}
										onClick={addGroup}
										disabled={disabled()}
									>
										<FaSolidPlus size={14} />
										<span class="sr-only">{T()("actions.add.entry")}</span>
									</button>
								</div>
							)}
						</DragDrop>
					</Match>
					<Match when={groups().length === 0}>
						<button
							type="button"
							class={classNames(
								"w-full dotted-background border border-dashed border-border p-4 md:p-6 min-h-32 rounded-md flex items-center justify-center text-center transition-colors duration-200",
								{
									group: !disabled(),
									"cursor-not-allowed opacity-50": disabled(),
									"hover:bg-card-hover/50": !disabled(),
								},
							)}
							onClick={addGroup}
							disabled={disabled()}
						>
							<span class="text-sm text-unfocused group-hover:hidden">
								{T()("empty.states.entries.inline")}
							</span>
							<span class="hidden text-sm text-body group-hover:inline-flex items-center gap-2">
								<FaSolidPlus size={14} />
								<span class="sr-only">{T()("actions.add.entry")}</span>
							</span>
						</button>
					</Match>
				</Switch>
			</div>
		</div>
	);
};
