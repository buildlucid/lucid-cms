import type { ErrorResult, FieldError } from "@types";
import classnames from "classnames";
import {
	type Component,
	createEffect,
	createSignal,
	type JSX,
	type JSXElement,
	onMount,
	Show,
	splitProps,
} from "solid-js";
import { Field } from "@/components/Field/Field";
import { FormTooltip } from "@/components/FormTooltip/FormTooltip";
import T from "@/translations";

export interface SwitchProps extends JSX.AriaAttributes {
	id: string;
	name?: string;
	value: boolean;
	onChange: (_value: boolean) => void;
	label?: string;
	/** Sits under the control, and is read out alongside it. */
	description?: string;
	/** Adds a hover card beside the label. */
	tooltip?: string;
	/** Shown on the control when it is on. @default "True" */
	trueLabel?: string;
	/** Shown on the control when it is off. @default "False" */
	falseLabel?: string;
	errors?: ErrorResult | FieldError;
	required?: boolean;
	disabled?: boolean;
	/** Puts the label beside the control rather than above it. */
	labelLeft?: boolean;
	/** Before the label text, for an icon or badge. */
	labelStart?: JSXElement;
	/** Applied to the field. Target [data-switch-control] for the control. */
	class?: string;
}

/**
 * A two state toggle that names both states on the control, with its
 * description and any validation errors underneath. Any aria attribute you
 * pass lands on the control.
 *
 * @example
 * ```tsx
 * import { Switch } from "@lucidcms/admin/components";
 *
 * return (
 * 	<Switch
 * 		id="enabled"
 * 		name="enabled"
 * 		label="Status"
 * 		value={enabled()}
 * 		onChange={setEnabled}
 * 	/>
 * );
 * ```
 */
export const Switch: Component<SwitchProps> = (props) => {
	// ----------------------------------------
	// State
	//* everything left over is the caller's aria-*, which belongs on the control
	const [, ariaProps] = splitProps(props, [
		"id",
		"name",
		"value",
		"onChange",
		"label",
		"description",
		"tooltip",
		"trueLabel",
		"falseLabel",
		"errors",
		"required",
		"disabled",
		"labelLeft",
		"labelStart",
		"class",
	]);
	let checkboxRef: HTMLInputElement | undefined;
	let falseSpanRef: HTMLSpanElement | undefined;
	let trueSpanRef: HTMLSpanElement | undefined;
	let overlayRef: HTMLSpanElement | undefined;
	const [_inputFocus, setInputFocus] = createSignal(false);
	const [overlayStyle, setOverlayStyle] = createSignal({});

	// ----------------------------------------
	// Memos

	// ----------------------------------------
	// Functions
	/** The highlight sits inset from the track by this much on every side. */
	const OVERLAY_INSET = 4;
	const updateOverlayPosition = () => {
		if (!falseSpanRef || !trueSpanRef || !overlayRef) return;
		const activeSpan = props.value ? trueSpanRef : falseSpanRef;
		setOverlayStyle({
			width: `${Math.max(activeSpan.offsetWidth - OVERLAY_INSET * 2, 0)}px`,
			transform: `translateX(${props.value ? falseSpanRef.offsetWidth : 0}px)`,
			left: `${OVERLAY_INSET}px`,
		});
	};
	const switchButton = () => (
		<button
			{...ariaProps}
			type="button"
			data-switch-control
			class={classnames(
				"h-9 disabled:cursor-not-allowed disabled:opacity-50 rounded-md flex relative focus:outline-hidden ring-1 ring-inset focus-visible:ring-1 transition-colors duration-200 group bg-input-base ring-border focus-visible:ring-primary-base",
				{
					"shrink-0": props.labelLeft,
				},
			)}
			onClick={() => {
				checkboxRef?.click();
			}}
			onFocus={() => {
				setInputFocus(true);
			}}
			onBlur={() => {
				setInputFocus(false);
			}}
			disabled={props.disabled}
		>
			<span
				ref={falseSpanRef}
				class={classnames(
					"flex-1 py-1 px-3 h-full flex items-center justify-center text-center z-10 relative duration-200 transition-colors text-sm",
					!props.value && "text-secondary-contrast",
					props.value && "text-subtitle",
				)}
			>
				{props.falseLabel || T()("common.false")}
			</span>
			<span
				ref={trueSpanRef}
				class={classnames(
					"flex-1 px-3 h-full py-1 flex items-center justify-center text-center z-10 relative duration-200 transition-colors text-sm",
					props.value && "text-secondary-contrast",
					!props.value && "text-subtitle",
				)}
			>
				{props.trueLabel || T()("common.true")}
			</span>
			<span
				ref={overlayRef}
				class="absolute top-1 bottom-1 transition-all duration-200 rounded-md z-0 bg-secondary-base group-hover:bg-secondary-hover"
				style={{
					...overlayStyle(),
				}}
			/>
		</button>
	);
	const fieldLabel = (className?: string) => (
		<Show when={props.label !== undefined || props.tooltip !== undefined}>
			<Field.Label
				class={className}
				start={props.labelStart}
				end={
					props.tooltip ? (
						<FormTooltip copy={props.tooltip} theme="inline" />
					) : undefined
				}
			>
				{props.label}
			</Field.Label>
		</Show>
	);

	// ----------------------------------------
	// Effects
	onMount(() => {
		updateOverlayPosition();
	});

	createEffect(() => {
		props.value;
		updateOverlayPosition();
	});

	// ----------------------------------------
	// Render
	return (
		<Field.Root
			id={props.id}
			required={props.required}
			disabled={props.disabled}
			errors={props.errors}
			class={classnames("relative", props.class)}
		>
			<input
				ref={checkboxRef}
				type="checkbox"
				id={props.id}
				name={props.name}
				checked={props.value}
				onChange={(e) => {
					props.onChange(e.currentTarget.checked);
				}}
				class="hidden"
				disabled={props.disabled}
				aria-describedby={
					props.description ? `${props.id}-description` : undefined
				}
				aria-invalid={props.errors !== undefined}
			/>
			<Show
				when={props.labelLeft}
				fallback={
					<>
						{fieldLabel()}
						{switchButton()}
					</>
				}
			>
				<div class="flex items-center justify-between gap-3">
					{fieldLabel()}
					{switchButton()}
				</div>
			</Show>
			<Field.Error />
			<Show when={props.description}>
				{(description) => (
					<Field.Description>{description()}</Field.Description>
				)}
			</Show>
		</Field.Root>
	);
};
