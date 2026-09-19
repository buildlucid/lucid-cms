import type { ErrorResult, FieldError } from "@types";
import {
	type Component,
	type JSX,
	type JSXElement,
	Show,
	splitProps,
} from "solid-js";
import { Field } from "@/components/Field/Field";

export interface TextareaProps
	extends Omit<
		JSX.TextareaHTMLAttributes<HTMLTextAreaElement>,
		"id" | "name" | "value" | "onChange" | "onInput" | "class"
	> {
	id: string;
	name: string;
	value: string;
	onChange: (_value: string) => void;
	label?: string;
	/** Sits under the control, and is read out alongside it. */
	description?: string;
	errors?: ErrorResult | FieldError;
	/** Before the label text, for an icon or badge. */
	labelStart?: JSXElement;
	/** After the label, against the right edge. */
	labelEnd?: JSXElement;
	/** Applied to the field. Target [data-textarea-control] for the textarea. */
	class?: string;
}

/**
 * A labelled multi line text input, with its description and any validation
 * errors. Every other textarea attribute, such as placeholder, rows, required
 * or maxlength, passes through to the element.
 *
 * @example
 * ```tsx
 * import { Textarea } from "@lucidcms/admin/components";
 *
 * return (
 * 	<Textarea
 * 		id="summary"
 * 		name="summary"
 * 		label="Summary"
 * 		value={summary()}
 * 		onChange={setSummary}
 * 		rows={4}
 * 	/>
 * );
 * ```
 */
export const Textarea: Component<TextareaProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [local, rest] = splitProps(props, [
		"id",
		"name",
		"value",
		"onChange",
		"label",
		"description",
		"errors",
		"labelStart",
		"labelEnd",
		"class",
	]);

	// ----------------------------------------
	// Render
	return (
		<Field.Root
			id={local.id}
			required={rest.required}
			disabled={rest.disabled}
			errors={local.errors}
			class={local.class}
		>
			<Show when={local.label !== undefined || local.labelEnd !== undefined}>
				<Field.Label start={local.labelStart} end={local.labelEnd}>
					{local.label}
				</Field.Label>
			</Show>
			<textarea
				{...rest}
				data-textarea-control
				id={local.id}
				name={local.name}
				value={local.value}
				rows={rest.rows ?? 6}
				class="focus:outline-hidden text-sm text-subtitle font-medium resize-none w-full block disabled:cursor-not-allowed disabled:opacity-80 bg-input-base border border-border rounded-md p-2 focus:border-primary-base duration-200 transition-colors"
				aria-describedby={
					local.description ? `${local.id}-description` : undefined
				}
				onInput={(event) => local.onChange(event.currentTarget.value)}
				onKeyDown={(event) => event.stopPropagation()}
			/>
			<Field.Error />
			<Show when={local.description}>
				{(description) => (
					<Field.Description>{description()}</Field.Description>
				)}
			</Show>
		</Field.Root>
	);
};
