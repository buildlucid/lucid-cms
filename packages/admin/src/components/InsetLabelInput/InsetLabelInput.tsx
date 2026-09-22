import type { ErrorResult, FieldError } from "@types";
import classnames from "classnames";
import { FaSolidEye, FaSolidEyeSlash } from "solid-icons/fa";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import { FieldFeedback } from "@/components/FieldFeedback/FieldFeedback";
import { FormLabel } from "@/components/FormLabel/FormLabel";
import { FormTooltip } from "@/components/FormTooltip/FormTooltip";

export const InsetLabelInput: Component<{
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
		<div class={"w-full"}>
			<div
				class={classnames(
					"flex flex-col transition-colors duration-200 ease-in-out relative bg-input rounded-md border border-border",
					{
						"border-primary": inputFocus(),
						"border-danger": props.errors?.message !== undefined,
					},
				)}
			>
				<FormLabel
					id={props.id}
					label={props.copy?.label}
					focused={inputFocus()}
					required={props.required}
					theme={"full"}
					altLocaleError={props.altLocaleError}
					localised={props.localised}
					fieldColumnIsMissing={props.fieldColumnIsMissing}
				/>
				<input
					class={classnames(
						"focus:outline-hidden px-2 text-sm text-subtitle disabled:cursor-not-allowed disabled:opacity-80 bg-transparent pb-2 pt-1 rounded-b-md",
						{
							"pr-8": props.type === "password",
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
						class="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary-hover hover:text-primary duration-200 transition-colors"
						onClick={() => {
							setPasswordVisible(!passwordVisible());
						}}
						tabIndex={-1}
					>
						<Show when={passwordVisible()}>
							<FaSolidEyeSlash size={18} class="text-muted" />
						</Show>
						<Show when={!passwordVisible()}>
							<FaSolidEye size={18} class="text-muted" />
						</Show>
					</button>
				</Show>
				<FormTooltip copy={props.copy?.tooltip} theme={"full"} />
			</div>
			<FieldFeedback
				id={props.id}
				describedBy={props.copy?.describedBy}
				errors={props.errors}
			/>
		</div>
	);
};
