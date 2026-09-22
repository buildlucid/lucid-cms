import type { ErrorResult, FieldError } from "@types";
import {
	type Component,
	For,
	type JSX,
	type JSXElement,
	Show,
	splitProps,
} from "solid-js";
import Field from "@/components/Field/Field";
import { FormTooltip } from "@/components/FormTooltip/FormTooltip";
import T from "@/translations";

export interface ColorPickerProps extends JSX.AriaAttributes {
	id: string;
	name: string;
	/** Any CSS colour. The picker sets hex values. */
	value: string;
	onChange: (_value: string) => void;
	label?: string;
	description?: string;
	/** Help text shown in a tooltip beside the input. */
	tooltip?: string;
	placeholder?: string;
	/** Colours shown as swatches under the input. */
	presets?: string[];
	errors?: ErrorResult | FieldError;
	required?: boolean;
	disabled?: boolean;
	labelStart?: JSXElement;
	labelEnd?: JSXElement;
	/** Applied to the field. Target `[data-color-picker-control]` for the input. */
	class?: string;
}

/**
 * A colour input with a picker, and optional preset swatches.
 *
 * @example
 * ```tsx
 * import { ColorPicker } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<ColorPicker
 * 		id="accent"
 * 		name="accent"
 * 		label={t("accent.colour")}
 * 		value={accent()}
 * 		onChange={setAccent}
 * 		presets={["#0f172a", "#2563eb", "#16a34a"]}
 * 	/>
 * );
 * ```
 */
const ColorPicker: Component<ColorPickerProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [, ariaProps] = splitProps(props, [
		"id",
		"name",
		"value",
		"onChange",
		"label",
		"description",
		"tooltip",
		"placeholder",
		"presets",
		"errors",
		"required",
		"disabled",
		"labelStart",
		"labelEnd",
		"class",
	]);
	let pickerRef: HTMLInputElement | undefined;

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
			<div class="relative">
				<button
					type="button"
					class="absolute left-2 top-1/2 size-6 -translate-y-1/2 cursor-pointer rounded border border-border focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary-base disabled:cursor-not-allowed disabled:opacity-80"
					style={{ "background-color": props.value || undefined }}
					disabled={props.disabled}
					title={T()("fields.color.picker.open")}
					aria-label={T()("fields.color.picker.open")}
					onClick={() => pickerRef?.click()}
				/>
				{/* the native picker is what the swatch opens, so it stays out of the tab order */}
				<input
					ref={pickerRef}
					type="color"
					class="sr-only"
					value={props.value}
					onInput={(event) => props.onChange(event.currentTarget.value)}
					disabled={props.disabled}
					tabIndex={-1}
					aria-hidden="true"
				/>
				<input
					{...ariaProps}
					data-color-picker-control
					id={props.id}
					name={props.name}
					type="text"
					value={props.value}
					placeholder={props.placeholder}
					required={props.required}
					disabled={props.disabled}
					class="w-full focus:outline-hidden pl-10 pr-2 text-sm text-subtitle disabled:cursor-not-allowed disabled:opacity-80 bg-input-base border border-border h-10 rounded-md focus:border-primary-base duration-200 transition-colors"
					aria-describedby={
						props.description ? `${props.id}-description` : undefined
					}
					onInput={(event) => props.onChange(event.currentTarget.value)}
					onKeyDown={(event) => event.stopPropagation()}
				/>
			</div>
			<Show when={(props.presets?.length ?? 0) > 0}>
				<div class="mt-2 overflow-x-auto hide-scrollbar">
					<ul class="flex flex-nowrap items-center gap-1">
						<For each={props.presets}>
							{(preset) => (
								<li class="shrink-0">
									<button
										type="button"
										class="block size-7 rounded-md border border-border focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary-base disabled:cursor-not-allowed disabled:opacity-80"
										style={{ "background-color": preset }}
										disabled={props.disabled}
										title={preset}
										aria-label={T()("fields.color.preset", { value: preset })}
										onClick={() => props.onChange(preset)}
									/>
								</li>
							)}
						</For>
					</ul>
				</div>
			</Show>
			<FormTooltip copy={props.tooltip} theme="basic" />
			<Field.Error />
			<Show when={props.description}>
				{(description) => (
					<Field.Description>{description()}</Field.Description>
				)}
			</Show>
		</Field.Root>
	);
};

export default ColorPicker;
