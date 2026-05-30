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
import { Input } from "@/components/Groups/Form/Input";
import { Select } from "@/components/Groups/Form/Select";
import { SelectMultiple } from "@/components/Groups/Form/SelectMultiple";
import Button from "@/components/Partials/Button";
import DropdownContent from "@/components/Partials/DropdownContent";
import UserSelectOption, {
	type UserSelectOptionUser,
} from "@/components/Partials/UserSelectOption";
import type { SearchParamsResponse } from "@/hooks/useSearchParamsLocation";
import T from "@/translations";

type FilterOption = {
	label: string;
	value: string | number;
	user?: UserSelectOptionUser;
};

interface FilterItemProps {
	filter: {
		label: string;
		key: string;
		type: "text" | "select" | "boolean" | "multi-select";
		options?: FilterOption[];
		optionType?: "user";
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
	const [multiValue, setMultiValue] = createSignal<FilterOption[]>([]);

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
					const option = props.filter.options?.find(
						(o) => o.value === v || o.value.toString() === v.toString(),
					);
					return (
						option ?? {
							value: v,
							label: v.toString(),
						}
					);
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
	const setFilterParam = (
		nextValue?: string | boolean | Array<string | number>,
	) => {
		if (props.filter.type === "text" || props.filter.type === "select") {
			props.searchParams.setParams({
				filters: {
					[props.filter.key]:
						typeof nextValue === "string" ? nextValue : value(),
				},
			});
		} else if (props.filter.type === "multi-select") {
			const values = Array.isArray(nextValue)
				? nextValue
				: multiValue().map((v) => v.value);
			props.searchParams.setParams({
				filters: {
					[props.filter.key]: values,
				},
			});
		} else if (props.filter.type === "boolean") {
			props.searchParams.setParams({
				filters: {
					[props.filter.key]:
						typeof nextValue === "boolean" ? nextValue : boolValue(),
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
	const userSelectOption = (option: FilterOption) => (
		<UserSelectOption
			user={option.user ?? { username: option.label }}
			label={option.label}
		/>
	);

	// ----------------------------------
	// Render
	return (
		<li class="mb-2 last-of-type:mb-0" role="none">
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
							const nextValue = value === undefined ? "" : value.toString();
							setValue(nextValue);
							setFilterParam(nextValue);
						}}
						name={`${props.filter.key}-${props.filter.type}`}
						options={props.filter.options || []}
						hidePlaceholder={true}
						noMargin={true}
						renderValue={
							props.filter.optionType === "user"
								? (props) => userSelectOption(props.option)
								: undefined
						}
						renderOption={
							props.filter.optionType === "user"
								? (props) => userSelectOption(props.option)
								: undefined
						}
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
								let nextValue: boolean | undefined;
								if (boolValue() === true) {
									nextValue = undefined;
								} else {
									nextValue = true;
								}
								setBoolValue(nextValue);
								setFilterParam(nextValue);
							}}
						>
							{props.filter.trueLabel
								? props.filter.trueLabel
								: T()("common.status.active")}
						</Button>
						<Button
							theme="secondary-toggle"
							size="small"
							type="button"
							active={boolValue() === false}
							onClick={() => {
								let nextValue: boolean | undefined;
								if (boolValue() === false) {
									nextValue = undefined;
								} else {
									nextValue = false;
								}
								setBoolValue(nextValue);
								setFilterParam(nextValue);
							}}
						>
							{props.filter.falseLabel
								? props.filter.falseLabel
								: T()("common.status.inactive")}
						</Button>
					</div>
				</Match>
				<Match when={props.filter.type === "multi-select"}>
					<SelectMultiple
						id={`${props.filter.key}-${props.filter.type}`}
						values={multiValue()}
						onChange={(values) => {
							setMultiValue(values);
							setFilterParam(values.map((v) => v.value));
						}}
						name={`${props.filter.key}-${props.filter.type}`}
						options={props.filter.options || []}
						noMargin={true}
						triggerClasses={
							props.filter.optionType === "user"
								? "items-start gap-2 p-2"
								: undefined
						}
						selectedValuesContainerClasses={
							props.filter.optionType === "user" ? "gap-0" : undefined
						}
						selectedValueClasses={
							props.filter.optionType === "user"
								? "group w-full rounded-none first:rounded-t-md last:rounded-b-md border-x border-t last:border-b border-border bg-card-base hover:bg-card-hover text-title px-2 py-1.5"
								: undefined
						}
						renderValue={
							props.filter.optionType === "user"
								? (props) => (
										<UserSelectOption
											user={props.value.user ?? { username: props.value.label }}
											label={props.value.label}
											removeValue={props.removeValue}
										/>
									)
								: undefined
						}
						renderOption={
							props.filter.optionType === "user"
								? (props) => userSelectOption(props.option)
								: undefined
						}
					/>
				</Match>
			</Switch>
		</li>
	);
};

export const Filter: Component<FilterProps> = (props) => {
	// ----------------------------------
	// State
	let lastAnchorRect:
		| {
				x?: number;
				y?: number;
				width?: number;
				height?: number;
		  }
		| undefined;

	// ----------------------------------
	// Functions
	const getAnchorRect = (anchor?: HTMLElement) => {
		const rect = anchor?.getBoundingClientRect();

		if (rect && rect.width > 0 && rect.height > 0) {
			lastAnchorRect = {
				x: rect.x,
				y: rect.y,
				width: rect.width,
				height: rect.height,
			};
			return lastAnchorRect;
		}

		return lastAnchorRect;
	};

	// ----------------------------------
	// Render
	return (
		<DropdownMenu.Root getAnchorRect={getAnchorRect} modal={false}>
			<DropdownMenu.Trigger
				class="dropdown-trigger gap-2 bg-secondary-base hover:bg-secondary-hover text-secondary-contrast pl-2 pr-3 h-9 text-sm border border-transparent rounded-md flex items-center disabled:cursor-not-allowed disabled:text-unfocused disabled:fill-unfocused"
				disabled={props.disabled}
			>
				<DropdownMenu.Icon>
					<FaSolidFilter />
				</DropdownMenu.Icon>
				<span>{T()("common.filter")}</span>
			</DropdownMenu.Trigger>
			<DropdownContent
				options={{
					as: "ul",
					rounded: true,
					class: "w-[300px] z-60",
					onOpenAutoFocus: (e) => {
						e.preventDefault();
					},
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
