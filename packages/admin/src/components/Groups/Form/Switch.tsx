import T from "@/translations";
import {
	type Component,
	createSignal,
	createEffect,
	onMount,
	createMemo,
} from "solid-js";
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
	localised?: boolean;
	altLocaleError?: boolean;
	noMargin?: boolean;
	inline?: boolean;
	fieldColumnIsMissing?: boolean;
	theme?: "default" | "relaxed";
	hideOptionalText?: boolean;
}

export const Switch: Component<SwitchProps> = (props) => {
	let checkboxRef: HTMLInputElement | undefined;
	let falseSpanRef: HTMLSpanElement | undefined;
	let trueSpanRef: HTMLSpanElement | undefined;
	let overlayRef: HTMLSpanElement | undefined;
	const [inputFocus, setInputFocus] = createSignal(false);
	const [overlayStyle, setOverlayStyle] = createSignal({});
	const theme = createMemo(() => props.theme ?? "default");

	const updateOverlayPosition = () => {
		if (falseSpanRef && trueSpanRef && overlayRef) {
			const activeSpan = props.value ? trueSpanRef : falseSpanRef;
			const relaxedTheme = theme() === "relaxed";
			const gap = relaxedTheme ? 4 : 0;
			const widthValue = Math.max(
				activeSpan.offsetWidth - (relaxedTheme ? gap * 2 : 0),
				0,
			);
			const style: Record<string, string> = {
				width: `${widthValue}px`,
				transform: `translateX(${props.value ? falseSpanRef.offsetWidth : 0}px)`,
			};
			if (relaxedTheme) {
				style.left = `${gap}px`;
			}
			setOverlayStyle(style);
		}
	};

	onMount(() => {
		updateOverlayPosition();
	});

	createEffect(() => {
		props.value;
		updateOverlayPosition();
	});
	createEffect(() => {
		theme();
		updateOverlayPosition();
	});

	return (
		<div
			class={classnames("relative", {
				"mb-3 last:mb-0": props.noMargin !== true,
				"w-full": props.inline !== true,
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
				fieldColumnIsMissing={props.fieldColumnIsMissing}
				hideOptionalText={props.hideOptionalText}
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
					"h-9 disabled:cursor-not-allowed disabled:opacity-50 rounded-md flex relative focus:outline-hidden ring-1 ring-inset focus-visible:ring-1 transition-colors duration-200 group bg-input-base ring-border focus-visible:ring-primary-base",
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
						props.value && "text-title",
					)}
				>
					{props.copy?.false || T()("false")}
				</span>
				<span
					ref={trueSpanRef}
					class={classnames(
						"flex-1 px-3 h-full py-1 flex items-center justify-center text-center z-10 relative duration-200 transition-colors text-sm",
						props.value && "text-secondary-contrast",
						!props.value && "text-title",
					)}
				>
					{props.copy?.true || T()("true")}
				</span>
				<span
					ref={overlayRef}
					class={classnames(
						"absolute transition-all duration-200 rounded-md z-0 bg-secondary-base group-hover:bg-secondary-hover",
						{
							"top-0 bottom-0": theme() === "default",
							"top-1 bottom-1": theme() === "relaxed",
						},
					)}
					style={{
						...overlayStyle(),
					}}
				/>
			</button>
			<DescribedBy id={props.id} describedBy={props.copy?.describedBy} />
			<Tooltip copy={props.copy?.tooltip} theme={undefined} />
			<ErrorMessage id={props.id} errors={props.errors} />
		</div>
	);
};
