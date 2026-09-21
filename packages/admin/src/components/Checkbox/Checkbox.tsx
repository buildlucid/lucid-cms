import { Checkbox as KobalteCheckbox } from "@kobalte/core";
import type { ErrorResult, FieldError } from "@types";
import classnames from "classnames";
import { FaSolidCheck } from "solid-icons/fa";
import { type Component, createSignal, type JSXElement, Show } from "solid-js";
import Field from "@/components/Field/Field";
import { FormTooltip } from "@/components/FormTooltip/FormTooltip";

/**
 * How the control is drawn. The button variants put the tick inside a bordered
 * box that lines up with an input; the ones naming a colour fill with it once
 * ticked, while plain button stays neutral.
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
	/** Sits beside the tick, and says what ticking the box means. */
	label?: string;
	/** @default "default" */
	variant?: CheckboxVariant;
	/** Before the label text, for an icon or badge. */
	labelStart?: JSXElement;
	/** Sits under the control, and is read out alongside it. */
	description?: string;
	/** Adds a hover card beside the control. */
	tooltip?: string;
	errors?: ErrorResult | FieldError;
	required?: boolean;
	disabled?: boolean;
	/** Applied to the field. Target [data-checkbox-control] for the tick box. */
	class?: string;
}

/**
 * A tick box with its label beside it, plus any description and validation
 * errors underneath.
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
 * 		id="recursive"
 * 		name="recursive"
 * 		label={t("media.folders.delete.recursive.label")}
 * 		value={recursive()}
 * 		onChange={setRecursive}
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
	/** Only the variants naming a colour take one, and only once ticked. */
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
						"relative min-h-10 max-w-full cursor-pointer rounded-md border px-3 py-2 text-sm transition-colors duration-200":
							boxed(),
						// unticked, or a plain button: the neutral box an input lines up with
						"bg-input-base text-subtitle": boxed() && !filled(),
						"border-border":
							boxed() && !filled() && !focused() && props.errors === undefined,
						"border-error-base/50 bg-error-base/5":
							boxed() && !filled() && props.errors !== undefined && !focused(),
						"border-primary-base": boxed() && focused(),
						// unticked but coloured, so hovering previews the fill it will take
						"hover:bg-secondary-hover hover:text-secondary-contrast":
							boxed() && !filled() && coloured(),
						"hover:border-body/25 hover:bg-card-hover":
							boxed() && !filled() && !coloured(),
						"border-primary-base bg-primary-base text-primary-contrast hover:bg-primary-hover":
							filled() && props.variant === "button-primary",
						"border-secondary-base bg-secondary-base text-secondary-contrast hover:bg-secondary-hover":
							filled() && props.variant === "button-secondary",
						"border-error-base bg-error-base text-error-contrast hover:bg-error-hover":
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
								"cursor-pointer border-border bg-input-base text-secondary-contrast hover:border-secondary-base data-checked:border-secondary-hover data-checked:bg-secondary-base data-checked:fill-secondary-contrast":
									!filled(),
								"border-primary-base": !filled() && focused(),
								// on a filled box the tick has to invert to stay visible
								"border-card-base bg-card-base text-card-contrast": filled(),
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
