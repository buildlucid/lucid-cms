import { type Component, Show, createSignal, createMemo } from "solid-js";
import classnames from "classnames";
import { FaSolidEye, FaSolidEyeSlash } from "solid-icons/fa";
import type { ErrorResult, FieldError } from "@types";
import {
	Label,
	Tooltip,
	DescribedBy,
	ErrorMessage,
} from "@/components/Groups/Form";
import classNames from "classnames";

export const InputFull: Component<{
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
	disabled?: boolean;
	errors?: ErrorResult | FieldError;
	localised?: boolean;
	altLocaleError?: boolean;
	noMargin?: boolean;
	hideOptionalText?: boolean;
	fieldColumnIsMissing?: boolean;
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
			class={classnames("w-full", {
				"mb-3 last:mb-0": props.noMargin !== true,
			})}
		>
			<div
				class={classnames(
					"flex flex-col transition-colors duration-200 ease-in-out relative bg-input-base rounded-md border border-border",
					{
						"border-primary-base": inputFocus(),
						"border-error-base": props.errors?.message !== undefined,
					},
				)}
			>
				<Label
					id={props.id}
					label={props.copy?.label}
					focused={inputFocus()}
					required={props.required}
					theme={"full"}
					altLocaleError={props.altLocaleError}
					localised={props.localised}
					hideOptionalText={props.hideOptionalText}
					fieldColumnIsMissing={props.fieldColumnIsMissing}
				/>
				<input
					class={classnames(
						"focus:outline-hidden px-2 text-sm text-title disabled:cursor-not-allowed disabled:opacity-80 bg-transparent pb-2 pt-1 rounded-b-md",
						{
							"pr-[32px]": props.type === "password",
							"pt-2": props.copy?.label === undefined,
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
					disabled={props.disabled}
					onFocus={() => setInputFocus(true)}
					onKeyUp={(e) => props.onKeyUp?.(e)}
					onBlur={() => {
						setInputFocus(false);
						props.onBlur?.();
					}}
				/>
				{/* Show Password */}
				<Show when={props.type === "password"}>
					<button
						type="button"
						class={classNames(
							"absolute right-2.5 top-1/2 -translate-y-1/2 text-primary-hover hover:text-primary-base duration-200 transition-colors",
							{
								"top-10":
									props.required !== true && props.hideOptionalText !== true,
							},
						)}
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
				<Tooltip copy={props.copy?.tooltip} theme={"full"} />
			</div>
			<DescribedBy id={props.id} describedBy={props.copy?.describedBy} />
			<ErrorMessage id={props.id} errors={props.errors} />
		</div>
	);
};
