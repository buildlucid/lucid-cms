import { type Component, createSignal } from "solid-js";
import classnames from "classnames";
import type { ErrorResult, FieldError } from "@types";
import { Label, DescribedBy, ErrorMessage } from "@/components/Groups/Form";

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
	noMargin?: boolean;
	theme: "full" | "basic";
	rows?: number;
}

export const Textarea: Component<TextareaProps> = (props) => {
	const [inputFocus, setInputFocus] = createSignal(false);

	// ----------------------------------------
	// Render
	return (
		<div
			class={classnames("w-full", {
				"mb-0": props.noMargin,
				"mb-5 last:mb-0": !props.noMargin,
			})}
		>
			<div
				class={classnames(
					"flex flex-col transition-colors duration-200 ease-in-out relative",
					{
						"border-primary-base bg-container-3":
							inputFocus() && props.theme === "full",
						"border-error-base": props.errors?.message !== undefined,
						"bg-container-4 rounded-md border border-border-input":
							props.theme === "full",
					},
				)}
			>
				<Label
					id={props.id}
					label={props.copy?.label}
					focused={inputFocus()}
					required={props.required}
					theme={props.theme}
					altLocaleError={props.altLocaleError}
					localised={props.localised}
				/>
				<textarea
					class={classnames(
						"focus:outline-hidden text-sm text-title font-medium resize-none w-full block disabled:cursor-not-allowed disabled:opacity-80",
						{
							"pt-2": props.copy?.label === undefined,
							"bg-container-4 border border-border-input rounded-md mt-1 p-2.5 focus:border-primary-base duration-200 transition-colors":
								props.theme === "basic",
							"bg-transparent pb-2 px-2.5 pt-1 rounded-b-md":
								props.theme === "full",
						},
					)}
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
			<DescribedBy id={props.id} describedBy={props.copy?.describedBy} />
			<ErrorMessage id={props.id} errors={props.errors} />
		</div>
	);
};
