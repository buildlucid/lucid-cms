import type { ErrorResult, FieldError } from "@types";
import classnames from "classnames";
import {
	type Component,
	type JSX,
	type JSXElement,
	Show,
	splitProps,
} from "solid-js";
import Field from "@/components/Field/Field";

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
	description?: string;
	errors?: ErrorResult | FieldError;
	labelStart?: JSXElement;
	labelEnd?: JSXElement;
	/** Lets the user resize the textarea vertically. */
	resize?: boolean;
	/** Applied to the field. Target `[data-textarea-control]` for the textarea. */
	class?: string;
}

/**
 * A multi-line text input with a label, description and validation errors.
 * Other textarea attributes are passed to the `<textarea>`.
 *
 * @example
 * ```tsx
 * import { Textarea } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<Textarea
 * 		id="summary"
 * 		name="summary"
 * 		label={t("common.summary")}
 * 		value={summary()}
 * 		onChange={setSummary}
 * 		rows={4}
 * 	/>
 * );
 * ```
 */
const Textarea: Component<TextareaProps> = (props) => {
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
		"resize",
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
				class={classnames(
					"focus:outline-hidden text-sm text-subtitle font-medium w-full block disabled:cursor-not-allowed disabled:opacity-80 bg-input-base border border-border rounded-md p-2 focus:border-primary-base duration-200 transition-colors",
					local.resize ? "resize-y" : "resize-none",
				)}
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

export default Textarea;
