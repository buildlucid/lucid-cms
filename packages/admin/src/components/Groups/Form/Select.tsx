import { DropdownMenu } from "@kobalte/core";
import { debounce } from "@solid-primitives/scheduled";
import type { ErrorResult, FieldError } from "@types";
import classNames from "classnames";
import { FaSolidCheck, FaSolidSort, FaSolidXmark } from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createSignal,
	For,
	Match,
	Show,
	Switch,
} from "solid-js";
import { DescribedBy, ErrorMessage, Label } from "@/components/Groups/Form";
import DropdownContent from "@/components/Partials/DropdownContent";
import Spinner from "@/components/Partials/Spinner";
import T from "@/translations";

export type ValueT = string | number | undefined;

export interface SelectProps {
	id: string;
	value: ValueT;
	onChange: (_value: ValueT) => void;
	options: { value: ValueT; label: string }[];
	name: string;
	search?: {
		value: string;
		onChange: (_value: string) => void;
		isLoading: boolean;
	};
	copy?: {
		label?: string;
		describedBy?: string;
		searchPlaceholder?: string;
	};
	onBlur?: () => void;
	autoFoucs?: boolean;
	required?: boolean;
	disabled?: boolean;
	errors?: ErrorResult | FieldError;
	localised?: boolean;
	altLocaleError?: boolean;
	noMargin?: boolean;
	noClear?: boolean;
	hasError?: boolean;
	theme: "full" | "basic" | "basic-small";
	shortcut?: string;
	fieldColumnIsMissing?: boolean;
}

export const Select: Component<SelectProps> = (props) => {
	const [open, setOpen] = createSignal(false);
	const [inputFocus, setInputFocus] = createSignal(false);
	const [debouncedValue, setDebouncedValue] = createSignal("");
	const [selectedLabel, setSelectedLabel] = createSignal("");

	// ----------------------------------------
	// Functions
	const setSearchQuery = debounce((value: string) => {
		setDebouncedValue(value);
	}, 500);

	// ----------------------------------------
	// Effects
	createEffect(() => {
		props.search?.onChange(debouncedValue());
	});

	createEffect(() => {
		if (props.value === undefined) {
			setSelectedLabel(T()("nothing_selected"));
		}

		const selectedOption = props.options.find(
			(option) => option.value === props.value,
		);
		if (selectedOption) {
			setSelectedLabel(selectedOption.label);
		}
	});

	// ----------------------------------------
	// Render
	return (
		<div
			class={classNames("w-full", {
				"mb-0": props.noMargin,
				"mb-4 last:mb-0": !props.noMargin,
				"mb-2.5 last:mb-0":
					!props.noMargin &&
					(props.theme === "basic" || props.theme === "basic-small"),
			})}
		>
			{/* Select */}
			<DropdownMenu.Root
				sameWidth={true}
				open={open()}
				onOpenChange={setOpen}
				flip={true}
				gutter={5}
			>
				<div
					class={classNames(
						"flex flex-col transition-colors duration-200 ease-in-out relative",
						{
							"border-primary-base": inputFocus() && props.theme === "full",
							"border-error-base":
								props.errors?.message !== undefined || props.hasError,
							"bg-input-base rounded-md border border-border":
								props.theme === "full",
						},
					)}
				>
					{/* Label */}
					<Label
						id={props.id}
						label={props.copy?.label}
						focused={inputFocus()}
						required={props.required}
						theme={props.theme}
						altLocaleError={props.altLocaleError}
						localised={props.localised}
						fieldColumnIsMissing={props.fieldColumnIsMissing}
					/>
					{/* Trigger */}
					<DropdownMenu.Trigger
						class={classNames(
							"focus:outline-hidden overflow-hidden px-2 text-sm text-title font-medium w-full flex justify-between disabled:cursor-not-allowed disabled:opacity-80 focus:ring-0",
							{
								"bg-input-base border border-border flex items-center rounded-md focus:border-primary-base duration-200 transition-colors":
									props.theme === "basic" || props.theme === "basic-small",
								"h-10 bg-input-base border-border": props.theme === "basic",
								"h-9 bg-input-base border-border":
									props.theme === "basic-small",
								"mt-1": props.theme !== "full" && props.copy?.label,
								"pt-2 h-10 flex items-center":
									props.copy?.label === undefined && props.theme === "full",
								"bg-transparent pb-2 pt-1 rounded-b-md": props.theme === "full",
								"border-error-base":
									props.hasError && props.theme === "basic-small",
							},
						)}
						onFocus={() => setInputFocus(true)}
						onBlur={() => setInputFocus(false)}
						disabled={props.disabled}
					>
						<div class="flex items-center">
							<Show when={props.shortcut}>
								<span class="text-xs bg-background-base px-2 py-1 rounded-md mr-1 border border-border">
									{props.shortcut}
								</span>
							</Show>
							{selectedLabel() ? (
								<span class="truncate">{selectedLabel()}</span>
							) : (
								<span class="text-body">{T()("nothing_selected")}</span>
							)}
						</div>
						<div class="flex items-center gap-1">
							<Show when={props.noClear !== true}>
								<button
									type="button"
									class="pointer-events-auto h-5 w-5 flex items-center justify-center rounded-full text-primary-contrast hover:bg-error-base duration-200 transition-colors focus:outline-hidden focus:ring-1 ring-error-base focus:fill-error-base"
									onClick={(e) => {
										e.stopPropagation();
										props.onChange(undefined);
									}}
								>
									<FaSolidXmark size={16} class="text-title" />
								</button>
							</Show>
							<FaSolidSort size={16} class="text-title ml-1" />
						</div>
					</DropdownMenu.Trigger>
				</div>
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
						<div
							class="mb-1.5 sticky top-0"
							onKeyDown={(e) => {
								e.stopPropagation();
							}}
						>
							<div class="relative">
								<input
									type="text"
									class="bg-dropdown-base px-2 rounded-md w-full border border-border text-sm text-title font-medium h-10 focus:outline-hidden focus:border-primary-base"
									placeholder={props.copy?.searchPlaceholder || T()("search")}
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
												class="bg-primary-base pointer-events-auto h-5 w-5 flex items-center justify-center rounded-full mr-1 text-primary-contrast hover:bg-error-base duration-200 transition-colors focus:outline-hidden focus:ring-1 ring-error-base focus:fill-error-base"
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
												<span class="sr-only">{T()("clear")}</span>
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
										<li
											class="flex items-center justify-between text-sm text-body hover:bg-primary-hover hover:text-primary-contrast px-2 py-1 rounded-md cursor-pointer focus:outline-hidden focus:bg-primary-hover focus:text-primary-contrast"
											onClick={() => {
												props.onChange(option.value);
												setDebouncedValue("");
												setOpen(false);
											}}
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													props.onChange(option.value);
													setDebouncedValue("");
													setOpen(false);
												}
											}}
										>
											<span>{option.label}</span>
											<Show when={props.value === option.value}>
												<FaSolidCheck size={14} class="text-current mr-2" />
											</Show>
										</li>
									)}
								</For>
							</ul>
						</Match>
						<Match when={props.options.length === 0 && props.search?.value}>
							<span class="text-body w-full block px-2 py-1 text-sm">
								{T()("no_results_found")}
							</span>
						</Match>
						<Match when={props.options.length === 0}>
							<span class="text-body w-full block px-2 py-1 text-sm">
								{T()("no_options_available")}
							</span>
						</Match>
					</Switch>
				</DropdownContent>
			</DropdownMenu.Root>
			<DescribedBy id={props.id} describedBy={props.copy?.describedBy} />
			<ErrorMessage id={props.id} errors={props.errors} />
		</div>
	);
};
