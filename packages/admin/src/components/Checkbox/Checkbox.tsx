import { Checkbox as KobalteCheckbox, Tooltip } from "@kobalte/core";
import type { ErrorResult, FieldError } from "@types";
import classnames from "classnames";
import { FaSolidCheck, FaSolidMinus } from "solid-icons/fa";
import {
	type Component,
	createSignal,
	type JSX,
	type JSXElement,
	Show,
	splitProps,
} from "solid-js";
import Field from "@/components/Field/Field";
import { FormTooltip } from "@/components/FormTooltip/FormTooltip";

/**
 * The button variants draw the checkbox as a box that lines up with buttons.
 */
export type CheckboxVariant =
	| "default"
	| "button"
	| "button-primary"
	| "button-secondary"
	| "button-danger";

export interface CheckboxProps extends JSX.AriaAttributes {
	id: string;
	name?: string;
	value: boolean;
	onChange: (_value: boolean) => void;
	/** Shows a dash instead of a tick, such as when only some of a group is selected. */
	indeterminate?: boolean;
	label?: string;
	/** @default "default" */
	variant?: CheckboxVariant;
	labelStart?: JSXElement;
	description?: string;
	/** Help text shown in a tooltip beside the checkbox, or on hovering the whole box for the button variants. */
	tooltip?: string;
	errors?: ErrorResult | FieldError;
	required?: boolean;
	disabled?: boolean;
	/** Applied to the field. Target `[data-checkbox-control]` for the box. */
	class?: string;
}

/**
 * A checkbox with a label, description and validation errors.
 *
 * @example
 * ```tsx
 * import { Checkbox } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<Checkbox
 * 		id="notify"
 * 		label={t("notify.on.publish")}
 * 		value={notify()}
 * 		onChange={setNotify}
 * 	/>
 * );
 * ```
 */
const Checkbox: Component<CheckboxProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [, ariaProps] = splitProps(props, [
		"id",
		"name",
		"value",
		"onChange",
		"indeterminate",
		"label",
		"variant",
		"labelStart",
		"description",
		"tooltip",
		"errors",
		"required",
		"disabled",
		"class",
	]);
	const [focused, setFocused] = createSignal(false);
	const [tooltipOpen, setTooltipOpen] = createSignal(false);

	// ----------------------------------------
	// Derived State
	const boxed = () =>
		props.variant !== undefined && props.variant !== "default";
	const coloured = () => boxed() && props.variant !== "button";
	const filled = () => coloured() && props.value;

	// ----------------------------------------
	// Render
	const root = () => (
		<KobalteCheckbox.Root
			data-checkbox
			class={classnames("group flex items-center gap-2.5", {
				"relative min-h-9 max-w-full cursor-pointer rounded-md border px-3 py-1.5 text-sm transition-colors duration-200":
					boxed(),
				"bg-input text-subtitle": boxed() && !filled(),
				"border-border":
					boxed() && !filled() && !focused() && props.errors === undefined,
				"border-danger-low-border bg-danger-low":
					boxed() && !filled() && props.errors !== undefined && !focused(),
				"border-primary": boxed() && focused(),
				"hover:bg-secondary-hover hover:text-secondary-foreground":
					boxed() && !filled() && coloured(),
				"hover:border-body/25 hover:bg-card-hover":
					boxed() && !filled() && !coloured(),
				"border-primary bg-primary text-primary-foreground hover:bg-primary-hover":
					filled() && props.variant === "button-primary",
				"border-secondary bg-secondary text-secondary-foreground hover:bg-secondary-hover":
					filled() && props.variant === "button-secondary",
				"border-danger bg-danger text-danger-foreground hover:bg-danger-hover":
					filled() && props.variant === "button-danger",
				"cursor-not-allowed opacity-60": props.disabled,
			})}
			required={props.required}
			disabled={props.disabled}
			name={props.name}
			checked={props.value}
			indeterminate={props.indeterminate}
			onChange={props.onChange}
			id={props.id}
		>
			<KobalteCheckbox.Input
				{...ariaProps}
				onFocus={(event) => {
					setFocused(true);
					if (event.currentTarget.matches(":focus-visible")) {
						setTooltipOpen(true);
					}
				}}
				onBlur={() => {
					setFocused(false);
					setTooltipOpen(false);
				}}
			/>
			<KobalteCheckbox.Control
				data-checkbox-control
				onClick={(event) => event.stopPropagation()}
				class={classnames(
					"inline-flex h-5 w-5 min-w-5 items-center justify-center rounded-md border transition-colors duration-200",
					{
						//* stretches the hit area over the whole box, so any part of it toggles
						"after:absolute after:inset-0 after:content-['']": boxed(),
						"cursor-pointer border-border bg-input text-secondary-foreground hover:border-secondary data-checked:border-secondary-hover data-checked:bg-secondary data-checked:fill-secondary-foreground data-indeterminate:border-secondary-hover data-indeterminate:bg-secondary data-indeterminate:fill-secondary-foreground":
							!filled(),
						"border-primary": !filled() && focused(),
						"border-card bg-card text-body": filled(),
					},
				)}
			>
				<KobalteCheckbox.Indicator class="w-full h-full relative">
					<div class="absolute inset-0 flex justify-center items-center">
						<Show
							when={props.indeterminate}
							fallback={<FaSolidCheck size={10} />}
						>
							<FaSolidMinus size={10} />
						</Show>
					</div>
				</KobalteCheckbox.Indicator>
			</KobalteCheckbox.Control>
			<Show when={props.labelStart || props.label}>
				<KobalteCheckbox.Label
					data-checkbox-label
					class={classnames(
						"flex min-w-0 items-center gap-1 text-sm transition-colors duration-200",
						{
							truncate: boxed(),
							"ease-in-out text-body": !boxed(),
							"text-primary-hover": !boxed() && focused(),
						},
					)}
				>
					{props.labelStart}
					<Show when={props.label}>
						<span class="min-w-0 truncate">{props.label}</span>
					</Show>
				</KobalteCheckbox.Label>
			</Show>
			<Show when={boxed() && props.tooltip}>
				<KobalteCheckbox.Description class="sr-only">
					{props.tooltip}
				</KobalteCheckbox.Description>
			</Show>
		</KobalteCheckbox.Root>
	);

	return (
		<Field.Root
			id={props.id}
			required={props.required}
			disabled={props.disabled}
			errors={props.errors}
			class={props.class}
		>
			<div class="flex items-center justify-between">
				<Show
					when={boxed() && props.tooltip}
					fallback={
						<>
							{root()}
							<FormTooltip copy={props.tooltip} theme="inline" />
						</>
					}
				>
					{(tooltip) => (
						<Tooltip.Root
							open={tooltipOpen()}
							onOpenChange={setTooltipOpen}
							openDelay={400}
							placement="top"
						>
							<Tooltip.Trigger as="div" class="flex min-w-0 max-w-full">
								{root()}
							</Tooltip.Trigger>
							<Tooltip.Portal>
								<Tooltip.Content class="z-70 w-72 max-w-[calc(100vw-2rem)] rounded-md border border-border bg-card px-3 py-2 shadow-xs">
									<p class="text-sm text-body">{tooltip()}</p>
								</Tooltip.Content>
							</Tooltip.Portal>
						</Tooltip.Root>
					)}
				</Show>
			</div>
			<Field.Error />
			<Show when={props.description}>
				{(description) => (
					<Field.Description>{description()}</Field.Description>
				)}
			</Show>
		</Field.Root>
	);
};

export default Checkbox;
