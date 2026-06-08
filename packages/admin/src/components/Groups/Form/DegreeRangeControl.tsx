import type { Component } from "solid-js";
import { Label } from "@/components/Groups/Form/Label";

interface DegreeRangeControlProps {
	id: string;
	label: string;
	value: number;
	min: number;
	max: number;
	disabled?: boolean;
	onChange: (_value: number) => void;
}

export const DegreeRangeControl: Component<DegreeRangeControlProps> = (
	props,
) => {
	// ------------------------------------
	// Render
	return (
		<div>
			<Label
				id={props.id}
				label={props.label}
				theme="basic"
				hideOptionalText={true}
			/>
			<div class="flex items-center gap-3">
				<input
					id={props.id}
					type="range"
					min={props.min}
					max={props.max}
					step="1"
					value={props.value}
					disabled={props.disabled}
					aria-label={props.label}
					class="h-8 min-w-0 flex-1 accent-primary-base disabled:opacity-60"
					onInput={(event) => {
						props.onChange(Number(event.currentTarget.value));
					}}
				/>
				<div class="flex h-8 w-20 shrink-0 items-center rounded-md border border-border bg-input-base px-2 text-sm text-title">
					<input
						type="number"
						min={props.min}
						max={props.max}
						step="1"
						value={props.value}
						disabled={props.disabled}
						aria-label={props.label}
						class="w-full bg-transparent text-right text-sm text-title outline-hidden disabled:opacity-60"
						onInput={(event) => {
							props.onChange(Number(event.currentTarget.value));
						}}
					/>
					<span class="ml-1 text-xs text-unfocused">deg</span>
				</div>
			</div>
		</div>
	);
};
