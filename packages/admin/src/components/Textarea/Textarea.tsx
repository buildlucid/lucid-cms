import type { ErrorResult, FieldError } from "@types";
import classnames from "classnames";
import { type Component, createSignal, type JSXElement } from "solid-js";
import { FieldFeedback } from "@/components/FieldFeedback/FieldFeedback";
import { FormLabel } from "@/components/FormLabel/FormLabel";

interface TextareaProps {
	id: string;
	value: string;
	onChange: (_value: string) => void;
	name: string;
	copy?: {
		label?: string;
		placeholder?: string;
		describedBy?: string;
	};
	onBlur?: () => void;
	autoFoucs?: boolean;
	onKeyUp?: (_e: KeyboardEvent) => void;
	required?: boolean;
	disabled?: boolean;
	errors?: ErrorResult | FieldError;
	localised?: boolean;
	altLocaleError?: boolean;
	rows?: number;
	fieldColumnIsMissing?: boolean;
	labelRightSlot?: JSXElement;
}

export const Textarea: Component<TextareaProps> = (props) => {
	const [inputFocus, setInputFocus] = createSignal(false);

	// ----------------------------------------
	// Render
	return (
		<div class={"w-full"}>
			<FormLabel
				id={props.id}
				label={props.copy?.label}
				focused={inputFocus()}
				required={props.required}
				theme={"basic"}
				altLocaleError={props.altLocaleError}
				localised={props.localised}
				fieldColumnIsMissing={props.fieldColumnIsMissing}
				rightSlot={props.labelRightSlot}
			/>
			<div class="relative">
				<textarea
					class="focus:outline-hidden text-sm text-subtitle font-medium resize-none w-full block disabled:cursor-not-allowed disabled:opacity-80 bg-input-base border border-border rounded-md p-2 focus:border-primary-base duration-200 transition-colors"
					onKeyDown={(e) => {
						e.stopPropagation();
					}}
					id={props.id}
					name={props.name}
					value={props.value}
					onInput={(e) => props.onChange(e.currentTarget.value)}
					placeholder={props.copy?.placeholder}
					aria-describedby={
						props.copy?.describedBy ? `${props.id}-description` : undefined
					}
					autofocus={props.autoFoucs}
					required={props.required}
					disabled={props.disabled}
					onFocus={() => setInputFocus(true)}
					onKeyUp={(e) => props.onKeyUp?.(e)}
					onBlur={() => {
						setInputFocus(false);
						props.onBlur?.();
					}}
					rows={props.rows ?? 6}
				/>
			</div>
			<FieldFeedback
				id={props.id}
				describedBy={props.copy?.describedBy}
				errors={props.errors}
			/>
		</div>
	);
};
