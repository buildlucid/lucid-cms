import T from "@/translations";
import { type Component, createSignal, createEffect, onMount } from "solid-js";
import classnames from "classnames";
import type { ErrorResult, FieldError } from "@types";
import {
	Label,
	DescribedBy,
	ErrorMessage,
	Tooltip,
} from "@/components/Groups/Form";

interface SwitchProps {
	id: string;
	value: boolean;
	onChange: (_value: boolean) => void;
	name?: string;
	copy: {
		label?: string;
		describedBy?: string;
		true?: string;
		false?: string;
		tooltip?: string;
	};
	disabled?: boolean;
	required?: boolean;
	errors?: ErrorResult | FieldError;
	altLocaleError?: boolean;
	noMargin?: boolean;
	options?: {
		queryRow?: boolean;
	};
}

export const Switch: Component<SwitchProps> = (props) => {
	let checkboxRef: HTMLInputElement | undefined;
	let falseSpanRef: HTMLSpanElement | undefined;
	let trueSpanRef: HTMLSpanElement | undefined;
	let overlayRef: HTMLSpanElement | undefined;
	const [inputFocus, setInputFocus] = createSignal(false);
	const [overlayStyle, setOverlayStyle] = createSignal({});

	const updateOverlayPosition = () => {
		if (falseSpanRef && trueSpanRef && overlayRef) {
			const activeSpan = props.value ? trueSpanRef : falseSpanRef;
			setOverlayStyle({
				width: `${activeSpan.offsetWidth}px`,
				transform: `translateX(${props.value ? falseSpanRef.offsetWidth : 0}px)`,
			});
		}
	};

	onMount(() => {
		updateOverlayPosition();
	});

	createEffect(() => {
		props.value;
		updateOverlayPosition();
	});

	return (
		<div
			class={classnames("relative", {
				"mb-0": props.noMargin,
				"mb-15 last:mb-0": !props.noMargin && props.options?.queryRow !== true,
				"w-full": props.options?.queryRow !== true,
			})}
		>
			<Label
				id={props.id}
				label={props.copy?.label}
				focused={inputFocus()}
				required={props.required}
				theme={"basic"}
				altLocaleError={props.altLocaleError}
			/>
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
			/>
			<button
				type="button"
				class={classnames(
					"bg-container-4 h-10 disabled:cursor-not-allowed disabled:opacity-50 rounded-md flex relative focus:outline-hidden ring-1 ring-border-input focus:ring-1 ring-inset focus:ring-primary-base group",
					{
						"mt-1": props.options?.queryRow !== true,
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
						"flex-1 py-1 px-15 h-full flex items-center justify-center text-center z-10 relative duration-200 transition-colors text-base font-display",
						{
							"text-secondary-contrast": !props.value,
							"text-title": props.value,
						},
					)}
				>
					{props.copy?.false || T()("false")}
				</span>
				<span
					ref={trueSpanRef}
					class={classnames(
						"flex-1 px-15 h-full py-1 flex items-center justify-center text-center z-10 relative duration-200 transition-colors text-base font-display",
						{
							"text-secondary-contrast": props.value,
							"text-title": !props.value,
						},
					)}
				>
					{props.copy?.true || T()("true")}
				</span>
				<span
					ref={overlayRef}
					class="bg-secondary-base absolute top-0 bottom-0 transition-all duration-200 rounded-md z-0 group-hover:bg-secondary-hover"
					style={overlayStyle()}
				/>
			</button>
			<DescribedBy id={props.id} describedBy={props.copy?.describedBy} />
			<Tooltip copy={props.copy?.tooltip} theme={undefined} />
			<ErrorMessage id={props.id} errors={props.errors} />
		</div>
	);
};
