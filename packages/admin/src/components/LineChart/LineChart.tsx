import {
	Chart,
	type ChartData,
	type ChartOptions,
	registerables,
} from "chart.js";
import {
	type Component,
	createEffect,
	createSignal,
	onCleanup,
	onMount,
} from "solid-js";

let chartRegistered = false;

const registerChart = () => {
	if (chartRegistered) return;

	Chart.register(...registerables);
	chartRegistered = true;
};

export const LineChart: Component<{
	data: ChartData<"line">;
	options?: ChartOptions<"line">;
	ariaLabel: string;
	class?: string;
	animate?: boolean;
}> = (props) => {
	// ----------------------------------
	// State
	let canvasRef: HTMLCanvasElement | undefined;
	let chart: Chart<"line"> | undefined;
	let animationFrame: number | undefined;
	let updateFrame: number | undefined;
	const [isReady, setIsReady] = createSignal(false);

	// ----------------------------------
	// Lifecycle
	onMount(() => {
		registerChart();
		animationFrame = window.requestAnimationFrame(() => setIsReady(true));
	});
	onCleanup(() => {
		if (animationFrame) window.cancelAnimationFrame(animationFrame);
		if (updateFrame) window.cancelAnimationFrame(updateFrame);
		chart?.stop();
		chart?.destroy();
		chart = undefined;
	});

	// ----------------------------------
	// Effects
	createEffect(() => {
		if (!isReady()) return;
		if (!canvasRef?.isConnected) return;
		if (!canvasRef.ownerDocument.defaultView) return;

		const data = props.data;
		const options = props.options;
		const animate = props.animate !== false;

		if (updateFrame) window.cancelAnimationFrame(updateFrame);
		updateFrame = window.requestAnimationFrame(() => {
			updateFrame = undefined;

			if (!canvasRef?.isConnected) return;
			if (!canvasRef.ownerDocument.defaultView) return;

			if (!chart) {
				const context = canvasRef.getContext("2d");
				if (!context) return;

				chart = new Chart(context, {
					type: "line",
					data,
					options,
				});
				return;
			}

			chart.stop();
			chart.data = data;
			chart.options = options ?? {};

			if (animate) {
				chart.update();
			} else {
				chart.update("none");
			}
		});
	});

	// ----------------------------------
	// Render
	return (
		<canvas
			ref={canvasRef}
			class={props.class}
			role="img"
			aria-label={props.ariaLabel}
		/>
	);
};
