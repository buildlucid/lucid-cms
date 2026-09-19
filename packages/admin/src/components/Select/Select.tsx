import { DropdownMenu } from "@kobalte/core";
import { debounce } from "@solid-primitives/scheduled";
import type { ErrorResult, FieldError } from "@types";
import classNames from "classnames";
import {
	FaSolidCheck,
	FaSolidKeyboard,
	FaSolidSort,
	FaSolidXmark,
} from "solid-icons/fa";
import {
	createEffect,
	createSignal,
	For,
	type JSX,
	type JSXElement,
	Match,
	Show,
	Switch,
	splitProps,
} from "solid-js";
import DropdownContent from "@/components/DropdownContent/DropdownContent";
import { Field } from "@/components/Field/Field";
import Spinner from "@/components/Spinner/Spinner";
import T from "@/translations";

export type ValueT = string | number | undefined;
export type SelectOptionT = { value: ValueT; label: string };

/** The value one of the options carries, or undefined when none is selected. */
export type SelectValue<Option extends SelectOptionT = SelectOptionT> =
	| Option["value"]
	| undefined;

/** Wiring for the search box above the options. */
export interface SelectSearch {
	value: string;
	onChange: (_value: string) => void;
	/** Shows a spinner in place of the clear button while results load. */
	isLoading?: boolean;
	placeholder?: string;
}

/** Height of the select trigger. */
export type SelectSize = "sm" | "md";

export interface SelectProps<Option extends SelectOptionT = SelectOptionT>
	extends JSX.AriaAttributes {
	id: string;
	name: string;
	value: SelectValue<Option>;
	onChange: (_value: SelectValue<Option>) => void;
	options: Option[];
	label?: string;
	/** Sits under the control, and is read out alongside it. */
	description?: string;
	errors?: ErrorResult | FieldError;
	required?: boolean;
	disabled?: boolean;
	/** Adds a search box above the options, for a list you load as you type. */
	search?: SelectSearch;
	/** Offers an option that clears the selection. */
	clearable?: boolean;
	/** Styles the trigger as invalid without showing a message. */
	hasError?: boolean;
	/** @default "md" */
	size?: SelectSize;
	/** Keyboard shortcut shown on the trigger. */
	shortcut?: string;
	shortcutDisplay?: "full" | "compact";
	/** Shown when nothing is selected. false leaves the trigger empty. */
	placeholder?: string | false;
	/** Before the label text, for an icon or badge. */
	labelStart?: JSXElement;
	/** After the label, against the right edge. */
	labelEnd?: JSXElement;
	/** Applied to the field. Target [data-select-trigger] for the trigger. */
	class?: string;
	renderValue?: (_props: { option: Option }) => JSXElement;
	renderOption?: (_props: { option: Option; selected: boolean }) => JSXElement;
}

/**
 * A labelled dropdown, with its description and any validation errors. Give it
 * a search callback to filter a long list as the user types. Any aria
 * attribute you pass lands on the trigger.
 *
 * @example
 * ```tsx
 * import { Select } from "@lucidcms/admin/components";
 *
 * return (
 * 	<Select
 * 		id="status"
 * 		name="status"
 * 		label="Status"
 * 		value={status()}
 * 		onChange={setStatus}
 * 		options={[
 * 			{ value: "draft", label: "Draft" },
 * 			{ value: "published", label: "Published" },
 * 		]}
 * 	/>
 * );
 * ```
 */
export function Select<Option extends SelectOptionT = SelectOptionT>(
	props: SelectProps<Option>,
) {
	//* everything left over is the caller's aria-*, which belongs on the trigger
	const [, ariaProps] = splitProps(props, [
		"id",
		"name",
		"value",
		"onChange",
		"options",
		"label",
		"description",
		"errors",
		"required",
		"disabled",
		"search",
		"clearable",
		"hasError",
		"size",
		"shortcut",
		"shortcutDisplay",
		"placeholder",
		"labelStart",
		"labelEnd",
		"class",
		"renderValue",
		"renderOption",
	]);
	const [open, setOpen] = createSignal(false);
	const [debouncedValue, setDebouncedValue] = createSignal("");
	const [selectedLabel, setSelectedLabel] = createSignal("");
	const [selectedOption, setSelectedOption] = createSignal<Option>();

	// ----------------------------------------
	// Functions
	/** Empty when turned off, the caller's wording if given, else the default. */
	const placeholderText = () =>
		props.placeholder === false
			? ""
			: (props.placeholder ?? T()("common.nothing.selected"));
	const setSearchQuery = debounce((value: string) => {
		setDebouncedValue(value);
	}, 500);
	const renderSelectedValue = () => {
		const option = selectedOption();
		if (option && props.renderValue) {
			return props.renderValue({
				option,
			});
		}
		if (selectedLabel()) {
			return <span class="truncate">{selectedLabel()}</span>;
		}
		if (props.placeholder === false) {
			return <span class="truncate">&nbsp;</span>;
		}

		return <span class="text-body">{placeholderText()}</span>;
	};

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (props.disabled) {
			setOpen(false);
		}
	});

	createEffect(() => {
		props.search?.onChange(debouncedValue());
	});

	createEffect(() => {
		if (props.value === undefined || props.value === "") {
			setSelectedOption(undefined);
			setSelectedLabel(placeholderText());
			return;
		}

		const selectedOption = props.options.find(
			(option) => option.value === props.value,
		);
		if (selectedOption) {
			setSelectedOption(() => selectedOption);
			setSelectedLabel(selectedOption.label);
			return;
		}

		setSelectedOption(undefined);
		setSelectedLabel(placeholderText());
	});

	// ----------------------------------------
	// Render
	return (
		<Field.Root
			id={props.id}
			required={props.required}
			disabled={props.disabled}
			errors={props.errors}
			class={props.class}
		>
			<DropdownMenu.Root
				sameWidth={true}
				open={open()}
				onOpenChange={(open) => setOpen(!props.disabled && open)}
				flip={true}
				gutter={5}
			>
				<Show when={props.label !== undefined || props.labelEnd !== undefined}>
					<Field.Label start={props.labelStart} end={props.labelEnd}>
						{props.label}
					</Field.Label>
				</Show>
				<DropdownMenu.Trigger
					data-select-trigger
					id={props.id}
					{...ariaProps}
					class={classNames(
						"focus:outline-hidden overflow-hidden px-2 text-sm text-subtitle font-medium w-full justify-between disabled:cursor-not-allowed disabled:opacity-80 focus:ring-0 bg-input-base border border-border flex items-center rounded-md focus:border-primary-base duration-200 transition-colors",
						{
							"h-10": props.size !== "sm",
							"h-9": props.size === "sm",
							"border-error-base": props.hasError,
						},
					)}
					disabled={props.disabled}
				>
					<div class="flex min-w-0 flex-1 items-center text-left">
						<Show
							when={
								props.shortcut &&
								(props.shortcutDisplay === undefined ||
									props.shortcutDisplay === "full")
							}
						>
							<span class="text-xs bg-background-base px-2 py-1 rounded-md mr-1 border border-border">
								{props.shortcut}
							</span>
						</Show>
						{renderSelectedValue()}
					</div>
					<div class="ml-2 flex shrink-0 items-center gap-1">
						<Show when={props.shortcut && props.shortcutDisplay === "compact"}>
							<span
								class="bg-background-base hidden px-1.5 py-1 rounded-md border border-border text-body md:inline-flex items-center justify-center"
								title={props.shortcut}
							>
								<FaSolidKeyboard size={12} aria-hidden="true" />
							</span>
						</Show>
						<Show
							when={
								props.clearable === true &&
								props.value !== undefined &&
								props.value !== ""
							}
						>
							<button
								type="button"
								disabled={props.disabled}
								class="pointer-events-auto h-5 w-5 flex items-center justify-center rounded-full text-icon-faded hover:bg-error-base hover:text-error-contrast duration-200 transition-colors focus:outline-hidden focus-visible:ring-1 ring-error-base focus:fill-error-base"
								onClick={(e) => {
									e.stopPropagation();
									if (props.disabled) {
										return;
									}

									props.onChange(undefined);
								}}
							>
								<FaSolidXmark size={14} class="text-current" />
							</button>
						</Show>
						<FaSolidSort size={14} class="text-subtitle ml-1" />
					</div>
				</DropdownMenu.Trigger>
				<DropdownContent
					options={{
						anchorWidth: true,
						rounded: true,
						class: "z-70 p-1.5!",
						maxHeight: "md",
						noMargin: true,
					}}
				>
					<Show when={props.search !== undefined}>
						{/** biome-ignore lint/a11y/noStaticElementInteractions: explanation */}
						<div
							class="mb-1.5 sticky top-0"
							onKeyDown={(e) => {
								e.stopPropagation();
							}}
						>
							<div class="relative">
								<input
									type="text"
									class="bg-input-base px-2 rounded-md w-full border border-border text-sm text-subtitle font-medium h-10 focus:outline-hidden focus:border-primary-base"
									placeholder={
										props.search?.placeholder || T()("common.search")
									}
									value={props.search?.value || ""}
									onKeyDown={(e) => {
										e.stopPropagation();
									}}
									onInput={(e) => setSearchQuery(e.currentTarget.value)}
								/>

								<Switch>
									<Match when={props.search?.isLoading}>
										<div class="absolute right-2 top-0 bottom-0 flex items-center">
											<Spinner size="sm" />
										</div>
									</Match>
									<Match when={props.search?.value}>
										<div class="absolute right-2 top-0 bottom-0 flex items-center">
											<button
												type="button"
												class="bg-primary-base pointer-events-auto h-5 w-5 flex items-center justify-center rounded-full mr-1 text-primary-contrast hover:bg-error-base duration-200 transition-colors focus:outline-hidden focus-visible:ring-1 ring-error-base focus:fill-error-base"
												onClick={() => {
													setDebouncedValue("");
												}}
												onKeyDown={(e) => {
													if (
														e.key === "Backspace" ||
														e.key === "Delete" ||
														e.key === "Enter" ||
														e.key === " "
													) {
														setDebouncedValue("");
													}
												}}
											>
												<FaSolidXmark size={14} />
												<span class="sr-only">{T()("common.clear")}</span>
											</button>
										</div>
									</Match>
								</Switch>
							</div>
						</div>
					</Show>
					<Switch>
						<Match when={props.options.length > 0}>
							<ul class="flex flex-col">
								<For each={props.options}>
									{(option) => (
										<DropdownMenu.Item
											as="li"
											textValue={option.label}
											disabled={props.disabled}
											class="flex items-center justify-between gap-2 text-sm text-subtitle hover:bg-card-hover hover:text-card-contrast px-2 py-1 rounded-md cursor-pointer focus:outline-hidden focus:bg-card-hover focus:text-card-contrast"
											onSelect={() => {
												if (props.disabled) {
													return;
												}

												props.onChange(option.value);
												setDebouncedValue("");
												setOpen(false);
											}}
										>
											{props.renderOption ? (
												props.renderOption({
													option,
													selected: props.value === option.value,
												})
											) : (
												<span class="min-w-0 flex-1 truncate">
													{option.label}
												</span>
											)}
											<Show when={props.value === option.value}>
												<FaSolidCheck size={14} class="shrink-0 text-current" />
											</Show>
										</DropdownMenu.Item>
									)}
								</For>
							</ul>
						</Match>
						<Match when={props.options.length === 0 && props.search?.value}>
							<span class="text-body w-full block px-2 py-1 text-sm">
								{T()("empty.states.search.no.results")}
							</span>
						</Match>
						<Match when={props.options.length === 0}>
							<span class="text-body w-full block px-2 py-1 text-sm">
								{T()("empty.states.options")}
							</span>
						</Match>
					</Switch>
				</DropdownContent>
			</DropdownMenu.Root>
			<Field.Error />
			<Show when={props.description}>
				{(description) => (
					<Field.Description>{description()}</Field.Description>
				)}
			</Show>
		</Field.Root>
	);
}
