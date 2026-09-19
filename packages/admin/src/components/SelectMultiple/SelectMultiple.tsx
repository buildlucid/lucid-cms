import { DropdownMenu } from "@kobalte/core";
import type { ErrorResult } from "@types";
import classnames from "classnames";
import { FaSolidCheck, FaSolidSort } from "solid-icons/fa";
import {
	createEffect,
	createSignal,
	For,
	type JSXElement,
	Match,
	Show,
	Switch,
} from "solid-js";
import DropdownContent from "@/components/DropdownContent/DropdownContent";
import { FieldFeedback } from "@/components/FieldFeedback/FieldFeedback";
import { FormLabel } from "@/components/FormLabel/FormLabel";
import T from "@/translations";

export type SelectMultipleValueT = {
	value: string | number;
	label: string;
};

interface SelectMultipleProps<Value extends SelectMultipleValueT> {
	id: string;
	values: Value[];
	onChange: (_value: Value[]) => void;
	options: Value[];
	name: string;
	copy?: {
		label?: string;
		placeholder?: string;
		describedBy?: string;
	};
	required?: boolean;
	disabled?: boolean;
	errors?: ErrorResult;
	localised?: boolean;
	altLocaleError?: boolean;
	triggerClasses?: string;
	selectedValuesContainerClasses?: string;
	selectedValueClasses?: string;
	renderValue?: (_props: {
		value: Value;
		removeValue: () => void;
	}) => JSXElement;
	renderOption?: (_props: { option: Value; selected: boolean }) => JSXElement;
}

export function SelectMultiple<
	Value extends SelectMultipleValueT = SelectMultipleValueT,
>(props: SelectMultipleProps<Value>) {
	const [open, setOpen] = createSignal(false);
	const [inputFocus, setInputFocus] = createSignal(false);

	// ----------------------------------------
	// Functions
	const setValues = (value: Value[]) => {
		if (props.disabled) {
			return;
		}

		props.onChange(value);
	};
	const removeValue = (value: Value) => {
		setValues(props.values.filter((v) => v.value !== value.value));
	};
	const toggleValue = (value: Value) => {
		const exists = props.values.find((v) => v.value === value.value);
		if (!exists) {
			setValues([...props.values, value]);
		} else {
			removeValue(value);
		}
	};

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (props.disabled) {
			setOpen(false);
		}
	});

	// ----------------------------------------
	// Render
	return (
		<div class={"w-full relative"}>
			<DropdownMenu.Root
				sameWidth={true}
				open={open()}
				onOpenChange={(open) => setOpen(!props.disabled && open)}
				flip={true}
				gutter={5}
			>
				{/* Label */}
				<FormLabel
					id={props.id}
					label={props.copy?.label}
					focused={inputFocus()}
					required={props.required}
					theme={"basic"}
					altLocaleError={props.altLocaleError}
					localised={props.localised}
				/>
				<DropdownMenu.Trigger
					id={props.id}
					aria-label={props.copy?.label}
					class={classnames(
						"focus:outline-hidden overflow-hidden px-2 text-sm text-subtitle font-medium w-full justify-between disabled:cursor-not-allowed disabled:opacity-80 focus:ring-0 bg-input-base border border-border flex items-center min-h-10 rounded-md focus:border-primary-base duration-200 transition-colors",
						props.triggerClasses,
					)}
					onFocus={() => setInputFocus(true)}
					onBlur={() => setInputFocus(false)}
					disabled={props.disabled}
				>
					{/* Selected Items */}
					<div
						class={classnames(
							"flex min-w-0 flex-1 flex-wrap text-left",
							props.selectedValuesContainerClasses ?? "gap-1",
						)}
					>
						<For
							each={props.values}
							fallback={
								<span class="text-body">{props.copy?.placeholder}</span>
							}
						>
							{(value) => (
								<span
									class={classnames(
										"duration-200 transition-colors rounded-md px-2 py-0.5 flex min-w-0 max-w-full items-center text-sm focus:outline-hidden",
										props.selectedValueClasses ??
											"bg-secondary-base hover:bg-secondary-hover text-secondary-contrast",
									)}
								>
									{props.renderValue
										? props.renderValue({
												value,
												removeValue: () => removeValue(value),
											})
										: value.label}
								</span>
							)}
						</For>
					</div>
					{/* Icons */}
					<div class="ml-2 flex shrink-0 self-center items-center">
						<FaSolidSort size={14} class="text-subtitle ml-1" />
					</div>
				</DropdownMenu.Trigger>
				<DropdownContent
					options={{
						anchorWidth: true,
						rounded: true,
						class: "max-h-36 overflow-y-auto z-70 p-1.5!",
						noMargin: true,
					}}
				>
					<Switch>
						<Match when={props.options.length > 0}>
							<ul class="flex flex-col">
								<For each={props.options}>
									{(option) => {
										const selected = () =>
											props.values.some((v) => v.value === option.value);

										return (
											<DropdownMenu.Item
												disabled={props.disabled}
												class="flex items-center justify-between gap-2 text-sm text-subtitle hover:bg-card-hover hover:text-card-contrast px-2 py-1 rounded-md cursor-pointer focus:outline-hidden focus:bg-card-hover focus:text-card-contrast"
												onSelect={() => {
													toggleValue(option);
												}}
												closeOnSelect={false}
											>
												{props.renderOption ? (
													props.renderOption({
														option,
														selected: selected(),
													})
												) : (
													<span class="min-w-0 flex-1 truncate">
														{option.label}
													</span>
												)}
												<Show when={selected()}>
													<FaSolidCheck
														size={14}
														class="shrink-0 fill-current"
													/>
												</Show>
											</DropdownMenu.Item>
										);
									}}
								</For>
							</ul>
						</Match>
						<Match when={props.options.length === 0}>
							<span class="text-body w-full block px-2 py-1 text-sm">
								{T()("empty.states.options")}
							</span>
						</Match>
					</Switch>
				</DropdownContent>
			</DropdownMenu.Root>

			<FieldFeedback
				id={props.id}
				describedBy={props.copy?.describedBy}
				errors={props.errors}
			/>
		</div>
	);
}
