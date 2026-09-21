import { Slider as KobalteSlider } from "@kobalte/core";
import type { ErrorResult, FieldError } from "@types";
import classnames from "classnames";
import {
	type Component,
	createMemo,
	For,
	Index,
	type JSXElement,
	Show,
} from "solid-js";
import Field from "@/components/Field/Field";
import { FormTooltip } from "@/components/FormTooltip/FormTooltip";
import T from "@/translations";

export interface SliderProps {
	id: string;
	name: string;
	/** One entry per thumb, low to high. */
	value: number[];
	onChange: (_value: number[]) => void;
	min: number;
	max: number;
	step: number;
	/** Two thumbs select a range rather than a single value. @default 1 */
	thumbs?: 1 | 2;
	label?: string;
	/** Sits under the control, and is read out alongside it. */
	description?: string;
	/** Adds a hover card next to the control. */
	tooltip?: string;
	errors?: ErrorResult | FieldError;
	required?: boolean;
	disabled?: boolean;
	/** Before the label text, for an icon or badge. */
	labelStart?: JSXElement;
	/** After the label, against the right edge. */
	labelEnd?: JSXElement;
	/** Applied to the field. Target [data-slider-control] for the track. */
	class?: string;
}

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

/** Beyond this the step markers stop reading as separate points. */
const MAX_STEP_MARKERS = 40;

/**
 * A labelled slider with a number input beside each thumb, so a value can be
 * dragged or typed. Two thumbs turn it into a range.
 *
 * @example
 * ```tsx
 * import { Slider } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<Slider
 * 		id="quality"
 * 		name="quality"
 * 		label={t("media.processed.quality")}
 * 		value={quality()}
 * 		onChange={setQuality}
 * 		min={0}
 * 		max={100}
 * 		step={5}
 * 	/>
 * );
 * ```
 */
const Slider: Component<SliderProps> = (props) => {
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
	const valueLabel = (index: number) => {
		if (props.thumbs !== 2) return T()("fields.range.value");
		return index === 0
			? T()("fields.range.start.value")
			: T()("fields.range.end.value");
	};
	const numericInputId = (index: number) =>
		index === 0 ? props.id : `${props.id}-value-${index}`;
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
				props.description ? `${props.id}-description` : undefined
			}
			class="h-8 w-12 shrink-0 appearance-none rounded-sm border border-transparent bg-transparent px-1 text-center text-sm font-medium tabular-nums text-title outline-hidden transition-colors duration-150 hover:border-border/50 hover:bg-input-base/30 focus:border-primary-base/60 focus:bg-input-base/40 focus:ring-1 focus:ring-primary-base/15 disabled:cursor-not-allowed disabled:opacity-60"
			onChange={(event) => {
				updateValue(index, Number(event.currentTarget.value));
			}}
		/>
	);

	// ----------------------------------------
	// Render
	return (
		<Field.Root
			id={props.id}
			required={props.required}
			disabled={props.disabled}
			errors={props.errors}
			class={props.class}
		>
			<Show when={props.label !== undefined || props.labelEnd !== undefined}>
				<Field.Label start={props.labelStart} end={props.labelEnd}>
					{props.label}
				</Field.Label>
			</Show>
			<div class="flex w-full items-center gap-1.5 sm:gap-2">
				{renderNumericInput(0)}
				<KobalteSlider.Root
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
					<KobalteSlider.Track
						data-slider-control
						class={classnames(
							"relative h-2.5 w-full rounded-full border border-border bg-input-base shadow-inner",
							{
								"cursor-not-allowed opacity-60": props.disabled,
								"cursor-pointer": !props.disabled,
							},
						)}
					>
						<KobalteSlider.Fill class="absolute inset-y-0 rounded-full bg-primary-muted-bg ring-1 ring-inset ring-primary-muted-border" />
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
								<KobalteSlider.Thumb
									aria-label={valueLabel(index)}
									aria-describedby={
										props.description ? `${props.id}-description` : undefined
									}
									class="top-1/2 z-20 -mt-2.5 size-5 rounded-full border-2 border-primary-base bg-background-base shadow-md outline-hidden transition-shadow duration-150 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-primary-base/30"
								/>
							)}
						</Index>
					</KobalteSlider.Track>
				</KobalteSlider.Root>
				<Show when={props.thumbs === 2}>{renderNumericInput(1)}</Show>
			</div>
			<FormTooltip copy={props.tooltip} theme="basic" />
			<Field.Error />
			<Show when={props.description}>
				{(description) => (
					<Field.Description>{description()}</Field.Description>
				)}
			</Show>
		</Field.Root>
	);
};

export default Slider;
