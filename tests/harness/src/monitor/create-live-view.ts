import { createLogUpdate } from "log-update";
import formatNote from "./format-note.ts";
import renderStatus from "./render-status.ts";
import type { RunState, RunView } from "./types.ts";

/** How often the status block redraws, which keeps its spinners and timers moving. */
const FRAME_MS = 100;

/**
 * Renders permanent log lines above a live status block, clearing and redrawing the block around
 * each log. Requires exclusive terminal output.
 */
const createLiveView = (state: RunState): RunView => {
	const block = createLogUpdate(process.stdout);
	const draw = () => {
		block(
			renderStatus(state, {
				width: process.stdout.columns ?? 120,
				height: process.stdout.rows ?? 40,
				now: Date.now(),
			}),
		);
	};
	const timer = setInterval(draw, FRAME_MS);
	timer.unref();

	return {
		notify: (note) => {
			block.persist(formatNote(note, state).join("\n"));
			draw();
		},
		stop: () => {
			clearInterval(timer);
			block.clear();
			block.done();
		},
	};
};

export default createLiveView;
