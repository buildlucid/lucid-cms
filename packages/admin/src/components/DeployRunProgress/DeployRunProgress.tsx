import classNames from "classnames";
import { type Component, createMemo, Index } from "solid-js";
import T from "@/translations";

/**
 * Matches the history layout with estimated progress. Unknown or overdue runs animate a wave, or a
 * shimmer for `segments`.
 */
const DeployRunProgress: Component<{
	/** From 0 to 1, or null when it can't be estimated. */
	progress: number | null;
	/** Matches the history's slots. @default 20 */
	slots?: number;
	/** Shown on hover, such as how long is left. */
	title?: string;
	/** Matches the history's shape. @default "bars" */
	variant?: "bars" | "segments";
	class?: string;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const slots = createMemo(() => props.slots ?? 20);
	const segments = createMemo(() => props.variant === "segments");
	const filled = createMemo(() =>
		props.progress === null ? 0 : Math.floor(props.progress * slots()),
	);

	// ----------------------------------------
	// Render
	return (
		<div
			role="progressbar"
			aria-label={T()("deploys.progress.label")}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={
				props.progress === null ? undefined : Math.round(props.progress * 100)
			}
			title={props.title}
			class={classNames(
				"flex w-full",
				segments() ? "gap-0.5" : "h-5 gap-[3px]",
				props.class,
			)}
		>
			<Index each={Array.from({ length: slots() })}>
				{(_, index) => (
					<span
						class={classNames(
							"min-w-0 flex-1 rounded-full transition-colors duration-500",
							segments() ? "h-0.75" : "h-full",
							props.progress === null
								? classNames(
										"bg-blue/60",
										segments()
											? "motion-safe:animate-pulse"
											: "motion-safe:animate-wave",
									)
								: {
										"bg-blue": index < filled(),
										"bg-blue motion-safe:animate-pulse": index === filled(),
										"bg-blue/15": index > filled(),
									},
						)}
						style={
							props.progress === null
								? { "animation-delay": `${index * 60}ms` }
								: undefined
						}
					/>
				)}
			</Index>
		</div>
	);
};

export default DeployRunProgress;
