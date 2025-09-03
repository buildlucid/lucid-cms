import classNames from "classnames";
import { type Component, createSignal, onMount, Show } from "solid-js";

interface ProgressBarProps {
	progress: number;
	type: "usage" | "target";
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
	// On Mount
	onMount(() => {
		setProgress(props.progress);
	});

	// ----------------------------------------
	// Render
	return (
		<>
			<div
				class="w-full bg-input-base h-3 rounded-md overflow-hidden"
				role="progressbar"
				aria-valuenow={getProgress()}
				aria-valuemin="0"
				aria-valuemax="100"
				aria-valuetext={`${getProgress()}% progress`}
				tabIndex={-1}
			>
				<div
					class={classNames("h-full rounded-md duration-200 transition-all", {
						// usage
						"bg-error-base": props.type === "usage" && getProgress() > 90,
						"bg-white": props.type === "usage" && getProgress() <= 90,
						// target
						"bg-primary-base": props.type === "target" && getProgress() > 90,
						"bg-primary-base ": props.type === "target" && getProgress() <= 90,
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
