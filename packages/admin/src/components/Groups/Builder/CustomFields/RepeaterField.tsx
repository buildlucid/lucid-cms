import T from "@/translations/index";
import classNames from "classnames";
import {
	type Component,
	createMemo,
	Show,
	Switch,
	Match,
	Index,
} from "solid-js";
import type { CFConfig, FieldError, FieldResponse } from "@types";
import contentLocaleStore from "@/store/contentLocaleStore";
import brickStore from "@/store/brickStore";
import helpers from "@/utils/helpers";
import { GroupBody } from "@/components/Groups/Builder";
import Button from "@/components/Partials/Button";
import DragDrop from "@/components/Partials/DragDrop";
import { FaSolidPlus } from "solid-icons/fa";

interface RepeaterFieldProps {
	state: {
		brickIndex: number;
		fieldConfig: CFConfig<"repeater">;
		fieldData?: FieldResponse;
		groupRef?: string;
		parentRepeaterKey?: string;
		repeaterDepth: number;
		fieldError: FieldError | undefined;
		missingFieldColumns: string[];
	};
}

export const RepeaterField: Component<RepeaterFieldProps> = (props) => {
	// -------------------------------
	// Memos
	const contentLocales = createMemo(
		() => contentLocaleStore.get.locales.map((locale) => locale.code) || [],
	);
	const fieldConfig = createMemo(() => props.state.fieldConfig);
	const brickIndex = createMemo(() => props.state.brickIndex);
	const groups = createMemo(() => props.state.fieldData?.groups || []);
	const canAddGroup = createMemo(() => {
		if (!fieldConfig().validation?.maxGroups) return true;
		return groups().length < (fieldConfig().validation?.maxGroups || 0);
	});
	const dragDropKey = createMemo(() => {
		return `${fieldConfig().key}-${props.state.parentRepeaterKey || ""}-${
			props.state.groupRef || ""
		}`;
	});
	const isDisabled = createMemo(
		() =>
			!canAddGroup() ||
			fieldConfig().config.isDisabled ||
			brickStore.get.locked,
	);
	const groupErrors = createMemo(() => {
		return props.state.fieldError?.groupErrors || [];
	});
	const missingFieldColumns = createMemo(() => props.state.missingFieldColumns);

	// -------------------------------
	// Functions
	const addGroup = () => {
		if (!fieldConfig().fields) return;
		brickStore.get.addRepeaterGroup({
			brickIndex: brickIndex(),
			fieldConfig: fieldConfig().fields || [],
			key: fieldConfig().key,
			ref: props.state.groupRef,
			parentRepeaterKey: props.state.parentRepeaterKey,
			locales: contentLocales(),
		});
	};

	// -------------------------------
	// Render
	return (
		<div
			class={classNames("mb-2.5 last:mb-0 w-full", {
				"mt-5": props.state.repeaterDepth > 0,
			})}
		>
			<p
				class={
					"block text-sm transition-colors duration-200 ease-in-out mb-1.5 text-title"
				}
			>
				{helpers.getLocaleValue({
					value: fieldConfig().details?.label,
				})}
			</p>
			{/* Repeater Body */}
			<Switch>
				<Match when={groups().length > 0}>
					<DragDrop
						sortOrder={(ref, targetRef) => {
							brickStore.get.swapGroupOrder({
								brickIndex: props.state.brickIndex,
								repeaterKey: fieldConfig().key,
								selectedRef: ref,
								targetRef: targetRef,

								ref: props.state.groupRef,
								parentRepeaterKey: props.state.parentRepeaterKey,
							});
						}}
					>
						{({ dragDrop }) => (
							<Index each={groups()}>
								{(g, i) => (
									<GroupBody
										state={{
											brickIndex: brickIndex(),
											fieldConfig: fieldConfig(),
											dragDropKey: dragDropKey(),
											group: g(),
											dragDrop: dragDrop,
											repeaterKey: fieldConfig().key,
											groupIndex: i,
											repeaterDepth: props.state.repeaterDepth,
											parentRepeaterKey: props.state.parentRepeaterKey,
											parentRef: props.state.groupRef,
											groupErrors: groupErrors(),
											missingFieldColumns: missingFieldColumns(),
										}}
									/>
								)}
							</Index>
						)}
					</DragDrop>
				</Match>
				<Match when={groups().length === 0}>
					<div class="w-full border-border border-dashed border p-4 md:p-6 min-h-32 rounded-md flex items-center flex-col justify-center text-center">
						<span class="text-sm text-unfocused capitalize">
							{T()("no_entries")}
						</span>
					</div>
				</Match>
			</Switch>
			{/* Repeater Footer */}
			<div class="w-full flex justify-between items-center mt-2.5">
				<Button
					type="button"
					theme="secondary"
					size="small"
					onClick={addGroup}
					disabled={isDisabled()}
				>
					{T()("add_entry")}
				</Button>
				<Show when={fieldConfig().validation?.maxGroups !== undefined}>
					<span
						class={classNames(
							"text-body text-sm font-body font-normal mr-[25px]",
							{
								"text-error-base": !canAddGroup(),
							},
						)}
					>
						{groups().length}
						{"/"}
						{fieldConfig().validation?.maxGroups}
					</span>
				</Show>
			</div>
		</div>
	);
};
