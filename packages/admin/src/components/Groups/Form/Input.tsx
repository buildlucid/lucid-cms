import type { ErrorResult, FieldError } from "@types";
import classnames from "classnames";
import { FaSolidEye, FaSolidEyeSlash } from "solid-icons/fa";
import {
	type Component,
	createMemo,
	createSignal,
	type JSXElement,
	Show,
} from "solid-js";
import {
	DescribedBy,
	ErrorMessage,
	Label,
	Tooltip,
} from "@/components/Groups/Form";

export const Input: Component<{
	id: string;
	value: string;
	onChange: (_value: string) => void;
	type: string;
	name: string;
	copy?: {
		label?: string;
		placeholder?: string;
		describedBy?: string;
		tooltip?: string;
	};
	onBlur?: () => void;
	autoFoucs?: boolean;
	onKeyUp?: (_e: KeyboardEvent) => void;
	autoComplete?: string;
	required?: boolean;
	minLength?: number;
	maxLength?: number;
	min?: number;
	max?: number;
	step?: number;
	disabled?: boolean;
	errors?: ErrorResult | FieldError;
	localised?: boolean;
	altLocaleError?: boolean;
	noMargin?: boolean;
	hideOptionalText?: boolean;
	fieldColumnIsMissing?: boolean;
	labelRightSlot?: JSXElement;
	rightAction?: JSXElement;
}> = (props) => {
	const [inputFocus, setInputFocus] = createSignal(false);
	const [passwordVisible, setPasswordVisible] = createSignal(false);

	// ----------------------------------------
	// Memos
	const inputType = createMemo(() => {
		if (props.type === "password" && passwordVisible()) return "text";
		return props.type;
	});

	// ----------------------------------------
	// Render
	return (
		<div
			class={classnames("group w-full relative", {
				"mb-3 last:mb-0": props.noMargin !== true,
			})}
		>
			<Label
				id={props.id}
				label={props.copy?.label}
				focused={inputFocus()}
				required={props.required}
				theme={"basic"}
				altLocaleError={props.altLocaleError}
				localised={props.localised}
				hideOptionalText={props.hideOptionalText}
				fieldColumnIsMissing={props.fieldColumnIsMissing}
				rightSlot={props.labelRightSlot}
			/>
			<div class="relative">
				<input
					class={classnames(
						"w-full focus:outline-hidden px-2 text-sm text-subtitle disabled:cursor-not-allowed disabled:opacity-80 bg-input-base border border-border h-10 rounded-md focus:border-primary-base duration-200 transition-colors",
						{
							"pr-8": props.type === "password" || props.rightAction,
						},
					)}
					onKeyDown={(e) => {
						e.stopPropagation();
					}}
					id={props.id}
					name={props.name}
					type={inputType()}
					value={props.value}
					onInput={(e) => props.onChange(e.currentTarget.value)}
					placeholder={props.copy?.placeholder}
					aria-describedby={
						props.copy?.describedBy ? `${props.id}-description` : undefined
					}
					autocomplete={props.autoComplete}
					autofocus={props.autoFoucs}
					required={props.required}
					minlength={props.minLength}
					maxlength={props.maxLength}
					min={props.min}
					max={props.max}
					step={props.step}
					disabled={props.disabled}
					onFocus={() => setInputFocus(true)}
					onKeyUp={(e) => props.onKeyUp?.(e)}
					onBlur={() => {
						setInputFocus(false);
						props.onBlur?.();
					}}
				/>
				<Show when={props.rightAction}>{props.rightAction}</Show>
				<Show when={props.type === "password"}>
					<button
						type="button"
						class={
							"absolute right-2.5 top-1/2 -translate-y-1/2 text-primary-hover hover:text-primary-base duration-200 transition-colors"
						}
						onClick={() => {
							setPasswordVisible(!passwordVisible());
						}}
						tabIndex={-1}
					>
						<Show when={passwordVisible()}>
							<FaSolidEyeSlash size={18} class="text-unfocused" />
						</Show>
						<Show when={!passwordVisible()}>
							<FaSolidEye size={18} class="text-unfocused" />
						</Show>
					</button>
				</Show>
			</div>
			<Tooltip copy={props.copy?.tooltip} theme={"basic"} />
			<DescribedBy id={props.id} describedBy={props.copy?.describedBy} />
			<ErrorMessage id={props.id} errors={props.errors} />
		</div>
	);
};
