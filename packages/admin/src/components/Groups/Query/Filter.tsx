import { DropdownMenu } from "@kobalte/core";
import { FaSolidFilter, FaSolidXmark } from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	Match,
	Show,
	Switch,
} from "solid-js";
import { Input, Select, SelectMultiple } from "@/components/Groups/Form";
import Button from "@/components/Partials/Button";
import DropdownContent from "@/components/Partials/DropdownContent";
import type { SearchParamsResponse } from "@/hooks/useSearchParamsLocation";
import T from "@/translations";

interface FilterItemProps {
	filter: {
		label: string;
		key: string;
		type: "text" | "select" | "boolean" | "multi-select";
		options?: Array<{
			label: string;
			value: string;
		}>;
		trueLabel?: string;
		falseLabel?: string;
	};
	searchParams: SearchParamsResponse;
}

export interface FilterProps {
	filters: Array<FilterItemProps["filter"]>;
	searchParams: SearchParamsResponse;
	disabled?: boolean;
}

const FilterItem: Component<FilterItemProps> = (props) => {
	// ----------------------------------
	// State
	const [value, setValue] = createSignal<string>("");
	const [boolValue, setBoolValue] = createSignal<boolean>();
	const [multiValue, setMultiValue] = createSignal<
		{
			value: string | number;
			label: string;
		}[]
	>([]);

	// ----------------------------------
	// Effects
	createEffect(() => {
		// on the filter change from search params, update the value
		const filters = props.searchParams.getFilters();
		const filter = filters.get(props.filter.key);

		if (typeof filter === "string" || typeof filter === "number") {
			setValue(filter.toString());
			if (filter === "1") {
				setBoolValue(true);
			} else if (filter === "0") {
				setBoolValue(false);
			}
		} else if (Array.isArray(filter)) {
			setMultiValue(
				filter.map((v) => {
					const label = props.filter.options?.find((o) => o.value === v)?.label;
					return {
						value: v,
						label: label || v.toString(),
					};
				}),
			);
		} else if (typeof filter === "boolean") {
			setBoolValue(filter);
		} else {
			setValue("");
			setMultiValue([]);
			setBoolValue(undefined);
		}
	});

	// ----------------------------------
	// Functions
	const setFilterParam = () => {
		if (props.filter.type === "text" || props.filter.type === "select") {
			props.searchParams.setParams({
				filters: {
					[props.filter.key]: value(),
				},
			});
		} else if (props.filter.type === "multi-select") {
			const values = multiValue().map((v) => v.value);
			props.searchParams.setParams({
				filters: {
					[props.filter.key]: values,
				},
			});
		} else if (props.filter.type === "boolean") {
			props.searchParams.setParams({
				filters: {
					[props.filter.key]: boolValue(),
				},
			});
		}
	};

	// ----------------------------------
	// Memos
	const showResetButton = createMemo(() => {
		if (props.filter.type === "text" || props.filter.type === "select") {
			return value() !== "";
		}
		if (props.filter.type === "multi-select") {
			return multiValue().length > 0;
		}
		if (props.filter.type === "boolean") {
			return boolValue() !== undefined;
		}
		return false;
	});

	// ----------------------------------
	// Render
	return (
		<DropdownMenu.Item
			class="mb-2 last-of-type:mb-0 focus:outline-hidden"
			closeOnSelect={false}
		>
			<label
				for={`${props.filter.key}-${props.filter.type}`}
				class="text-body flex items-center justify-between text-sm mb-1"
			>
				<span>{props.filter.label}</span>
				<Show when={showResetButton()}>
					<button
						onClick={() => {
							if (
								props.filter.type === "text" ||
								props.filter.type === "select"
							) {
								setValue("");
							} else if (props.filter.type === "multi-select") {
								setMultiValue([]);
							} else if (props.filter.type === "boolean") {
								setBoolValue(undefined);
							}

							props.searchParams.setParams({
								filters: {
									[props.filter.key]: undefined,
								},
							});
						}}
						type="button"
					>
						<FaSolidXmark class="w-3.5 h-3.5 text-error-base" />
					</button>
				</Show>
			</label>
			<Switch>
				<Match when={props.filter.type === "text"}>
					<Input
						id={`${props.filter.key}-${props.filter.type}`}
						value={value()}
						onChange={setValue}
						type="text"
						name={`${props.filter.key}-${props.filter.type}`}
						onBlur={setFilterParam}
						onKeyUp={(e) => {
							if (e.key === "Enter") {
								setFilterParam();
							}
						}}
						noMargin={true}
					/>
				</Match>
				<Match when={props.filter.type === "select"}>
					<Select
						id={`${props.filter.key}-${props.filter.type}`}
						value={value()}
						onChange={(value) => {
							if (!value) setValue("");
							else setValue(value.toString());
							setFilterParam();
						}}
						name={`${props.filter.key}-${props.filter.type}`}
						options={props.filter.options || []}
						noMargin={true}
					/>
				</Match>
				<Match when={props.filter.type === "boolean"}>
					<div class="grid grid-cols-2 gap-3">
						<Button
							theme="secondary-toggle"
							size="small"
							type="button"
							active={boolValue()}
							onClick={() => {
								if (boolValue() === true) {
									setBoolValue(undefined);
								} else {
									setBoolValue(true);
								}
								setFilterParam();
							}}
						>
							{props.filter.trueLabel ? props.filter.trueLabel : T()("active")}
						</Button>
						<Button
							theme="secondary-toggle"
							size="small"
							type="button"
							active={boolValue() === false}
							onClick={() => {
								if (boolValue() === false) {
									setBoolValue(undefined);
								} else {
									setBoolValue(false);
								}
								setFilterParam();
							}}
						>
							{props.filter.falseLabel
								? props.filter.falseLabel
								: T()("inactive")}
						</Button>
					</div>
				</Match>
				<Match when={props.filter.type === "multi-select"}>
					<SelectMultiple
						id={`${props.filter.key}-${props.filter.type}`}
						values={multiValue()}
						onChange={(values) => {
							setMultiValue(values);
							setFilterParam();
						}}
						name={`${props.filter.key}-${props.filter.type}`}
						options={props.filter.options || []}
						noMargin={true}
					/>
				</Match>
			</Switch>
		</DropdownMenu.Item>
	);
};

export const Filter: Component<FilterProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				class="dropdown-trigger bg-secondary-base hover:bg-secondary-hover text-secondary-contrast px-2 h-9 text-sm border border-transparent rounded-md flex items-center disabled:cursor-not-allowed disabled:text-unfocused disabled:fill-unfocused"
				disabled={props.disabled}
			>
				<DropdownMenu.Icon>
					<FaSolidFilter />
				</DropdownMenu.Icon>
				<span class="ml-2">{T()("filter")}</span>
			</DropdownMenu.Trigger>
			<DropdownContent
				options={{
					as: "ul",
					rounded: true,
					class: "w-[300px] z-60",
				}}
			>
				<For each={props.filters}>
					{(filter) => (
						<FilterItem filter={filter} searchParams={props.searchParams} />
					)}
				</For>
			</DropdownContent>
		</DropdownMenu.Root>
	);
};
