import { Checkbox as KobalteCheckbox } from "@kobalte/core";
import type { ErrorResult, FieldError } from "@types";
import classnames from "classnames";
import { FaSolidCheck } from "solid-icons/fa";
import { type Component, createSignal, type JSXElement, Show } from "solid-js";
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

export interface CheckboxProps {
	id: string;
	name?: string;
	value: boolean;
	onChange: (_value: boolean) => void;
	label?: string;
	/** @default "default" */
	variant?: CheckboxVariant;
	labelStart?: JSXElement;
	description?: string;
	/** Help text shown in a tooltip beside the checkbox. */
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
	const [focused, setFocused] = createSignal(false);

	// ----------------------------------------
	// Derived State
	const boxed = () =>
		props.variant !== undefined && props.variant !== "default";
	const coloured = () => boxed() && props.variant !== "button";
	const filled = () => coloured() && props.value;

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
			<div class="flex items-center justify-between">
				<KobalteCheckbox.Root
					data-checkbox
					class={classnames("group flex items-center gap-2.5", {
						"relative min-h-9 max-w-full cursor-pointer rounded-md border px-3 py-1.5 text-sm transition-colors duration-200":
							boxed(),
						// unticked, or a plain button: the neutral box an input lines up with
						"bg-input text-subtitle": boxed() && !filled(),
						"border-border":
							boxed() && !filled() && !focused() && props.errors === undefined,
						"border-danger-low-border bg-danger-low":
							boxed() && !filled() && props.errors !== undefined && !focused(),
						"border-primary": boxed() && focused(),
						// unticked but coloured, so hovering previews the fill it will take
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
					onChange={props.onChange}
					id={props.id}
				>
					<KobalteCheckbox.Input
						onFocus={() => setFocused(true)}
						onBlur={() => setFocused(false)}
					/>
					<KobalteCheckbox.Control
						data-checkbox-control
						onClick={(event) => event.stopPropagation()}
						class={classnames(
							"inline-flex h-5 w-5 min-w-5 items-center justify-center rounded-md border transition-colors duration-200",
							{
								//* stretches the hit area over the whole box, so any part of it toggles
								"after:absolute after:inset-0 after:content-['']": boxed(),
								"cursor-pointer border-border bg-input text-secondary-foreground hover:border-secondary data-checked:border-secondary-hover data-checked:bg-secondary data-checked:fill-secondary-foreground":
									!filled(),
								"border-primary": !filled() && focused(),
								// on a filled box the tick has to invert to stay visible
								"border-card bg-card text-body": filled(),
							},
						)}
					>
						<KobalteCheckbox.Indicator class="w-full h-full relative">
							<div class="absolute inset-0 flex justify-center items-center">
								<FaSolidCheck size={10} />
							</div>
						</KobalteCheckbox.Indicator>
					</KobalteCheckbox.Control>
					<Show when={props.labelStart || props.label}>
						<KobalteCheckbox.Label
							data-checkbox-label
							class={classnames(
								"flex min-w-0 items-center gap-1 text-sm transition-colors duration-200",
								{
									// boxed: the box owns the text colour, so let it through
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
				</KobalteCheckbox.Root>
				<FormTooltip copy={props.tooltip} theme="inline" />
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
