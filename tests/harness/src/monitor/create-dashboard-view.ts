import { createLogUpdate } from "log-update";
import renderDashboard from "./render-dashboard.ts";
import type { RunState, RunView } from "./types.ts";

/** How often the dashboard redraws, which keeps its spinners and timers moving. */
const FRAME_MS = 100;

/**
 * Redraws an interactive terminal dashboard, requiring exclusive terminal output. Clears it before
 * the final report.
 */
const createDashboardView = (): RunView => {
	const draw = createLogUpdate(process.stdout);
	let latest: RunState | undefined;

	const frame = () => {
		if (!latest) {
			return;
		}
		draw(
			renderDashboard(latest, {
				width: process.stdout.columns ?? 120,
				height: process.stdout.rows ?? 40,
				now: Date.now(),
			}),
		);
	};
	const timer = setInterval(frame, FRAME_MS);
	timer.unref();

	return {
		render: (state) => {
			latest = state;
		},
		notify: () => {},
		stop: () => {
			clearInterval(timer);
			draw.clear();
			draw.done();
		},
	};
};

export default createDashboardView;
