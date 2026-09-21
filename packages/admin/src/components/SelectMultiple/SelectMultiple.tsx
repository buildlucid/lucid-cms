import { DropdownMenu } from "@kobalte/core";
import type { ErrorResult, FieldError } from "@types";
import classnames from "classnames";
import { FaSolidCheck, FaSolidSort, FaSolidXmark } from "solid-icons/fa";
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
import Field from "@/components/Field/Field";
import T from "@/translations";

/** One entry a caller can pick from. */
export type SelectMultipleOption = {
	value: string | number;
	label: string;
};

/** How the chosen options sit in the trigger. */
export type SelectMultipleVariant = "default" | "list";

export interface SelectMultipleProps<
	Option extends SelectMultipleOption = SelectMultipleOption,
> extends JSX.AriaAttributes {
	id: string;
	name: string;
	values: Option[];
	onChange: (_values: Option[]) => void;
	options: Option[];
	label?: string;
	/** Shown in the trigger while nothing is chosen. */
	placeholder?: string;
	/** Sits under the control, and is read out alongside it. */
	description?: string;
	errors?: ErrorResult | FieldError;
	required?: boolean;
	disabled?: boolean;
	/** Chips on one line, or a stacked row per choice. @default "default" */
	variant?: SelectMultipleVariant;
	/** Before the label text, for an icon or badge. */
	labelStart?: JSXElement;
	/** After the label, against the right edge. */
	labelEnd?: JSXElement;
	/** Applied to the field. Target [data-select-multiple-trigger] for the trigger. */
	class?: string;
	renderValue?: (_props: {
		value: Option;
		removeValue: () => void;
	}) => JSXElement;
	renderOption?: (_props: { option: Option; selected: boolean }) => JSXElement;
}

/**
 * A labelled dropdown that keeps every option the caller picks, with its
 * description and any validation errors. The list variant stacks each choice
 * on its own full width row, for when a choice needs more than a chip.
 *
 * @example
 * ```tsx
 * import { SelectMultiple } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<SelectMultiple
 * 		id="roles"
 * 		name="roles"
 * 		label={t("common.roles")}
 * 		values={roles()}
 * 		onChange={setRoles}
 * 		options={[
 * 			{ value: "editor", label: "Editor" },
 * 			{ value: "admin", label: "Admin" },
 * 		]}
 * 	/>
 * );
 * ```
 */
function SelectMultiple<
	Option extends SelectMultipleOption = SelectMultipleOption,
>(props: SelectMultipleProps<Option>) {
	// ----------------------------------------
	// State & Hooks
	const [, ariaProps] = splitProps(props, [
		"id",
		"name",
		"values",
		"onChange",
		"options",
		"label",
		"placeholder",
		"description",
		"errors",
		"required",
		"disabled",
		"variant",
		"labelStart",
		"labelEnd",
		"class",
		"renderValue",
		"renderOption",
	]);
	const [open, setOpen] = createSignal(false);
	const stacked = () => props.variant === "list";

	// ----------------------------------------
	// Functions
	const setValues = (values: Option[]) => {
		if (props.disabled) {
			return;
		}

		props.onChange(values);
	};
	const removeValue = (value: Option) => {
		setValues(props.values.filter((v) => v.value !== value.value));
	};
	const toggleValue = (value: Option) => {
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
		<Field.Root
			id={props.id}
			required={props.required}
			disabled={props.disabled}
			errors={props.errors}
			class={props.class}
		>
			<Show when={props.label !== undefined || props.labelEnd !== undefined}>
				<Field.Label start={props.labelStart} end={props.labelEnd}>
					{props.label}
				</Field.Label>
			</Show>
			<DropdownMenu.Root
				sameWidth={true}
				open={open()}
				onOpenChange={(open) => setOpen(!props.disabled && open)}
				flip={true}
				gutter={5}
			>
				<DropdownMenu.Trigger
					{...ariaProps}
					data-select-multiple-trigger
					id={props.id}
					class={classnames(
						"focus:outline-hidden overflow-hidden text-sm text-subtitle font-medium w-full justify-between disabled:cursor-not-allowed disabled:opacity-80 focus:ring-0 bg-input-base border border-border flex min-h-10 rounded-md focus:border-primary-base duration-200 transition-colors",
						{
							"items-center px-2": !stacked(),
							"gap-2 p-2": stacked(),
							//* rows stack from the top, but a lone placeholder centres in that height
							"items-start": stacked() && props.values.length > 0,
							"items-center": stacked() && props.values.length === 0,
						},
					)}
					disabled={props.disabled}
				>
					<div
						class={classnames("flex min-w-0 flex-1 flex-wrap text-left", {
							"gap-1": !stacked(),
							"gap-0": stacked(),
						})}
					>
						<For
							each={props.values}
							fallback={<span class="text-body">{props.placeholder}</span>}
						>
							{(value) => (
								<span
									data-select-multiple-value
									class={classnames(
										"group relative flex min-w-0 max-w-full items-center gap-1 text-sm transition-colors duration-200 focus:outline-hidden",
										{
											"overflow-hidden rounded-md px-2 py-0.5 bg-secondary-base hover:bg-secondary-hover text-secondary-contrast":
												!stacked(),
											"w-full rounded-none first:rounded-t-md last:rounded-b-md border-x border-t last:border-b border-border bg-card-base hover:bg-card-hover text-subtitle px-2 py-1.5":
												stacked(),
										},
									)}
								>
									<Show
										when={props.renderValue}
										fallback={
											<>
												<span class="min-w-0 truncate">{value.label}</span>
												<Show when={!props.disabled}>
													<span
														class={classnames(
															"flex items-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100",
															{
																// the chip has no room to spare, so it fades in over the text
																"absolute inset-y-0 inset-e-0 ps-6 pe-1 bg-linear-to-l from-secondary-hover from-60% to-transparent":
																	!stacked(),
																"ml-auto": stacked(),
															},
														)}
													>
														{/* biome-ignore lint/a11y/useSemanticElements: a remove button cannot be nested inside the trigger button, which the HTML parser pulls apart. */}
														<span
															role="button"
															tabIndex={0}
															data-select-multiple-remove
															aria-label={`${T()("common.remove")} ${value.label}`}
															class="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded text-current hover:bg-error-base hover:text-error-contrast focus:outline-hidden focus-visible:ring-1 ring-error-base"
															onPointerDown={(event) => event.stopPropagation()}
															onClick={(event) => {
																event.stopPropagation();
																event.preventDefault();
																removeValue(value);
															}}
															onKeyDown={(event) => {
																if (
																	event.key !== "Enter" &&
																	event.key !== " "
																) {
																	return;
																}
																event.stopPropagation();
																event.preventDefault();
																removeValue(value);
															}}
														>
															<FaSolidXmark size={10} />
														</span>
													</span>
												</Show>
											</>
										}
									>
										{(renderValue) =>
											renderValue()({
												value,
												removeValue: () => removeValue(value),
											})
										}
									</Show>
								</span>
							)}
						</For>
					</div>
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
			<Field.Error />
			<Show when={props.description}>
				{(description) => (
					<Field.Description>{description()}</Field.Description>
				)}
			</Show>
		</Field.Root>
	);
}

export default SelectMultiple;
