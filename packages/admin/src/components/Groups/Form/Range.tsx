import { Slider } from "@kobalte/core";
import type { ErrorResult, FieldError } from "@types";
import classnames from "classnames";
import {
	type Component,
	createMemo,
	createSignal,
	For,
	Index,
	Show,
} from "solid-js";
import { DescribedBy, ErrorMessage, Label } from "@/components/Groups/Form";
import T from "@/translations";

interface RangeProps {
	id: string;
	name: string;
	value: number[];
	onChange: (value: number[]) => void;
	min: number;
	max: number;
	step: number;
	thumbs?: 1 | 2;
	copy?: {
		label?: string;
		describedBy?: string;
	};
	required?: boolean;
	disabled?: boolean;
	errors?: ErrorResult | FieldError;
	localised?: boolean;
	altLocaleError?: boolean;
	fieldColumnIsMissing?: boolean;
	hideOptionalText?: boolean;
}

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

const MAX_STEP_MARKERS = 40;

export const Range: Component<RangeProps> = (props) => {
	// ----------------------------------------
	// State
	const [inputFocus, setInputFocus] = createSignal(false);

	// ----------------------------------------
	// Memos
	const expectedLength = createMemo(() => (props.thumbs === 2 ? 2 : 1));
	const value = createMemo(() => {
		const normalized = props.value
			.filter((item) => typeof item === "number" && Number.isFinite(item))
			.slice(0, expectedLength())
			.map((item) => clamp(item, props.min, props.max))
			.toSorted((a, b) => a - b);

		if (normalized.length === expectedLength()) return normalized;
		return props.thumbs === 2 ? [props.min, props.max] : [props.min];
	});
	const valueLabel = (index: number) => {
		if (props.thumbs !== 2) return T()("fields.range.value");
		return index === 0
			? T()("fields.range.start.value")
			: T()("fields.range.end.value");
	};
	const numericInputId = (index: number) =>
		index === 0 ? props.id : `${props.id}-value-${index}`;
	const stepPositions = createMemo(() => {
		const distance = props.max - props.min;
		if (distance <= 0 || props.step <= 0) return [];

		const stepCount = Math.floor(distance / props.step + 1e-9);
		if (stepCount <= 1) return [];

		const interval = Math.max(1, Math.ceil(stepCount / MAX_STEP_MARKERS));
		const positions: number[] = [];
		for (let index = interval; index < stepCount; index += interval) {
			positions.push(((index * props.step) / distance) * 100);
		}
		return positions;
	});

	// ----------------------------------------
	// Functions
	const updateValue = (index: number, nextValue: number) => {
		if (!Number.isFinite(nextValue)) return;

		const next = [...value()];
		next[index] = clamp(nextValue, props.min, props.max);
		props.onChange(next.toSorted((a, b) => a - b));
	};
	const renderNumericInput = (index: number) => (
		<input
			id={numericInputId(index)}
			type="number"
			value={value()[index]}
			min={props.min}
			max={props.max}
			step={props.step}
			disabled={props.disabled}
			aria-label={valueLabel(index)}
			aria-describedby={
				props.copy?.describedBy ? `${props.id}-description` : undefined
			}
			class="h-8 w-14 shrink-0 appearance-none rounded-sm border border-transparent bg-transparent px-1.5 text-center text-sm font-medium tabular-nums text-title outline-hidden transition-colors duration-150 hover:border-border/50 hover:bg-input-base/30 focus:border-primary-base/60 focus:bg-input-base/40 focus:ring-1 focus:ring-primary-base/15 disabled:cursor-not-allowed disabled:opacity-60 sm:w-16"
			onFocus={() => setInputFocus(true)}
			onBlur={() => setInputFocus(false)}
			onChange={(event) => {
				updateValue(index, Number(event.currentTarget.value));
			}}
		/>
	);

	// ----------------------------------------
	// Render
	return (
		<div class="mb-3 last:mb-0 w-full">
			<Label
				id={props.id}
				label={props.copy?.label}
				focused={inputFocus()}
				required={props.required}
				theme="basic"
				altLocaleError={props.altLocaleError}
				localised={props.localised}
				fieldColumnIsMissing={props.fieldColumnIsMissing}
				hideOptionalText={props.hideOptionalText}
			/>
			<div class="flex w-full items-center gap-2.5 sm:gap-3">
				{renderNumericInput(0)}
				<Slider.Root
					id={`${props.id}-slider`}
					name={props.name}
					value={value()}
					onChange={props.onChange}
					minValue={props.min}
					maxValue={props.max}
					step={props.step}
					disabled={props.disabled}
					required={props.required}
					class="min-w-0 flex-1"
				>
					<Slider.Track
						class={classnames(
							"relative h-2 w-full rounded-full border border-border bg-input-base shadow-inner",
							{
								"cursor-not-allowed opacity-60": props.disabled,
								"cursor-pointer": !props.disabled,
							},
						)}
					>
						<Slider.Fill class="absolute inset-y-0 rounded-full bg-primary-base" />
						<div
							aria-hidden="true"
							class="pointer-events-none absolute inset-0 z-10"
						>
							<For each={stepPositions()}>
								{(position) => (
									<span
										class="absolute top-1/2 size-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-unfocused opacity-40"
										style={{ left: `${position}%` }}
									/>
								)}
							</For>
						</div>
						<Index each={value()}>
							{(_, index) => (
								<Slider.Thumb
									aria-label={valueLabel(index)}
									aria-describedby={
										props.copy?.describedBy
											? `${props.id}-description`
											: undefined
									}
									onFocus={() => setInputFocus(true)}
									onBlur={() => setInputFocus(false)}
									class="top-1/2 z-20 -mt-2.5 size-5 rounded-full border-2 border-primary-base bg-background-base shadow-md outline-hidden transition-shadow duration-150 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-primary-base/30"
								/>
							)}
						</Index>
					</Slider.Track>
				</Slider.Root>
				<Show when={props.thumbs === 2}>{renderNumericInput(1)}</Show>
			</div>
			<DescribedBy id={props.id} describedBy={props.copy?.describedBy} />
			<ErrorMessage id={props.id} errors={props.errors} />
		</div>
	);
};
