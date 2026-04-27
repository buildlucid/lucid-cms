import classNames from "classnames";
import { type Component, createEffect, createSignal, Show } from "solid-js";

interface ProgressBarProps {
	progress: number;
	type: "usage" | "target";
	variant?: "default" | "edge";
	labels?: {
		start?: string;
		end?: string;
	};
}

const ProgressBar: Component<ProgressBarProps> = (props) => {
	// ----------------------------------------
	// State
	const [getProgress, setProgress] = createSignal(0);

	// ----------------------------------------
	// Effects
	createEffect(() => {
		setProgress(props.progress);
	});

	// ----------------------------------------
	// Render
	return (
		<>
			<div
				class={classNames("w-full bg-input-base overflow-hidden", {
					"h-3 rounded-md": props.variant !== "edge",
					"h-2 rounded-none bg-primary-base/20": props.variant === "edge",
				})}
				role="progressbar"
				aria-valuenow={getProgress()}
				aria-valuemin="0"
				aria-valuemax="100"
				aria-valuetext={`${getProgress()}% progress`}
				tabIndex={-1}
			>
				<div
					class={classNames("h-full duration-200 transition-all", {
						"rounded-md": props.variant !== "edge",
						// usage
						"bg-error-base": props.type === "usage" && getProgress() > 90,
						"bg-white": props.type === "usage" && getProgress() <= 90,
						// target
						"bg-primary-base":
							props.type === "target" && props.variant !== "edge",
						"bg-primary-base/70":
							props.type === "target" && props.variant === "edge",
					})}
					style={{
						width: `${getProgress()}%`,
					}}
				/>
			</div>
			<Show when={props.labels}>
				<div class="flex justify-between gap-4 mt-2.5">
					<span class="text-sm">{props.labels?.start}</span>
					<span class="text-sm">{props.labels?.end}</span>
				</div>
			</Show>
		</>
	);
};

export default ProgressBar;
