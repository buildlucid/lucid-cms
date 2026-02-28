import type { CFConfig, FieldError, FieldResponse } from "@types";
import classNames from "classnames";
import { FaSolidPlus } from "solid-icons/fa";
import { type Component, createMemo, For, Match, Show, Switch } from "solid-js";
import { GroupBody } from "@/components/Groups/Builder";
import DragDrop from "@/components/Partials/DragDrop";
import brickStore from "@/store/brickStore";
import contentLocaleStore from "@/store/contentLocaleStore";
import T from "@/translations/index";
import helpers from "@/utils/helpers";

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
		<div class={"mb-2.5 last:mb-0 w-full"}>
			<div class={"w-full"}>
				<div class="w-full flex items-center justify-between gap-3 mb-1.5">
					<p class="block text-sm transition-colors duration-200 ease-in-out text-body">
						{helpers.getLocaleValue({
							value: fieldConfig().details?.label,
						})}
					</p>
					<Show when={fieldConfig().validation?.maxGroups !== undefined}>
						<span
							class={classNames("text-body text-xs", {
								"text-error-base": !canAddGroup(),
							})}
						>
							{groups().length}
							{"/"}
							{fieldConfig().validation?.maxGroups}
						</span>
					</Show>
				</div>
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
								<div class="w-full border border-border rounded-md overflow-hidden divide-y divide-border">
									<For each={groups()}>
										{(g, i) => (
											<GroupBody
												state={{
													brickIndex: brickIndex(),
													fieldConfig: fieldConfig(),
													dragDropKey: dragDropKey(),
													group: g,
													dragDrop: dragDrop,
													repeaterKey: fieldConfig().key,
													groupIndex: i(),
													repeaterDepth: props.state.repeaterDepth,
													parentRepeaterKey: props.state.parentRepeaterKey,
													parentRef: props.state.groupRef,
													groupErrors: groupErrors(),
													missingFieldColumns: missingFieldColumns(),
												}}
											/>
										)}
									</For>
									<button
										type="button"
										class={classNames(
											"w-full bg-input-base hover:border-transparent hover:bg-secondary-hover transition-colors duration-200 px-3 py-3 flex items-center justify-center text-sm text-body hover:text-secondary-contrast ring-inset",
											{
												"cursor-not-allowed opacity-50 hover:bg-card-base":
													isDisabled(),
											},
										)}
										onClick={addGroup}
										disabled={isDisabled()}
									>
										<FaSolidPlus size={14} />
										<span class="sr-only">{T()("add_entry")}</span>
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
									group: !isDisabled(),
									"cursor-not-allowed opacity-50": isDisabled(),
									"hover:bg-card-hover/50": !isDisabled(),
								},
							)}
							onClick={addGroup}
							disabled={isDisabled()}
						>
							<span class="text-sm text-unfocused group-hover:hidden">
								{T()("no_entries")}
							</span>
							<span class="hidden text-sm text-body group-hover:inline-flex items-center gap-2">
								<FaSolidPlus size={14} />
								<span class="sr-only">{T()("add_entry")}</span>
							</span>
						</button>
					</Match>
				</Switch>
			</div>
		</div>
	);
};
