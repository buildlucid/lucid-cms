import type { ErrorResult, FieldError } from "@types";
import classnames from "classnames";
import { TbOutlineArrowUp } from "solid-icons/tb";
import type { Component, JSXElement } from "solid-js";
import Button from "@/components/Button/Button";
import Field from "@/components/Field/Field";
import T from "@/translations";

/** Shows a generation textarea with toolbar controls and a Mod + Enter shortcut to send. */
const PromptField: Component<{
	id: string;
	name: string;
	label: string;
	value: string;
	onChange: (_value: string) => void;
	placeholder?: string;
	rows?: number;
	/** Shown at the start of the toolbar, such as a character count. */
	hint?: string;
	/** Marks the text invalid and shows the hint as an error, such as a script over its limit. */
	invalid?: boolean;
	errors?: ErrorResult | FieldError;
	/** Shown before the send button, such as the model picker. */
	toolbar?: JSXElement;
	/** Kept disabled while a generation runs, rather than showing a spinner. */
	submitDisabled: boolean;
	onSubmit: () => void;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Field.Root id={props.id} errors={props.errors}>
			<Field.Label>{props.label}</Field.Label>
			<div class="rounded-md border border-border bg-input transition-colors duration-200 focus-within:border-primary">
				<textarea
					id={props.id}
					name={props.name}
					value={props.value}
					rows={props.rows ?? 8}
					placeholder={props.placeholder}
					class="block w-full resize-none bg-transparent px-2 pt-2 text-sm font-medium text-subtitle focus:outline-hidden"
					aria-describedby={props.hint ? `${props.id}-hint` : undefined}
					aria-invalid={props.invalid || undefined}
					onInput={(event) => props.onChange(event.currentTarget.value)}
					onKeyDown={(event) => {
						event.stopPropagation();
						if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
							event.preventDefault();
							props.onSubmit();
						}
					}}
				/>
				<div class="flex min-w-0 items-center gap-1 px-2 pb-2">
					<p
						id={`${props.id}-hint`}
						class={classnames(
							"min-w-0 grow truncate ps-1 text-xs",
							props.invalid ? "text-danger" : "text-muted",
						)}
					>
						{props.hint}
					</p>
					{props.toolbar}
					<Button
						type="submit"
						shape="circle"
						size="xs"
						class="shrink-0"
						disabled={props.submitDisabled}
						aria-label={T()("ai.media.generate.modal.generate")}
						title={T()("ai.media.generate.modal.generate")}
					>
						<TbOutlineArrowUp size={11} />
					</Button>
				</div>
			</div>
			<Field.Error />
		</Field.Root>
	);
};

export default PromptField;
