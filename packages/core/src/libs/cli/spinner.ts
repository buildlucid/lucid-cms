import { stripVTControlCharacters } from "node:util";
import picocolors from "picocolors";

const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const FRAME_MS = 80;
const CLEAR_LINE = "\r\x1b[2K";

type Write = typeof process.stdout.write;

/** Shortens text to a width, so the spinner stays on one line and can redraw over itself. */
const fit = (text: string, width: number) =>
	text.length > width ? `${text.slice(0, Math.max(0, width - 1))}…` : text;

/** Shows `start` steps and `detail` updates only in interactive terminals outside CI, redrawing below other output until a result badge such as `LUCID CMS` ends it. */
const createSpinner = () => {
	const enabled = process.stdout.isTTY === true && !process.env.CI;
	const writes = { stdout: process.stdout.write, stderr: process.stderr.write };
	let step = "";
	let detail = "";
	let frame = 0;
	let timer: NodeJS.Timeout | undefined;
	let drawn = false;
	/** Whether a pause is in progress that should resume the spinner. */
	let paused = false;
	// Output that ends mid-line is left alone, so the spinner doesn't draw over it.
	let atLineStart = true;

	const raw = (text: string) => writes.stdout.call(process.stdout, text);

	const clear = () => {
		if (!drawn) return;
		raw(CLEAR_LINE);
		drawn = false;
	};

	const render = () => {
		if (!atLineStart) return;

		const width = (process.stdout.columns || 80) - 2;
		const label = fit(step, width);
		const room = width - label.length - 3;
		const line =
			detail && room > 1
				? `${label} ${picocolors.gray(`· ${fit(detail, room)}`)}`
				: label;

		raw(`${CLEAR_LINE}${picocolors.cyan(frames[frame])} ${line}`);
		drawn = true;
	};

	const hook = (stream: NodeJS.WriteStream, original: Write) => {
		// `write` is overloaded, so the wrapper passes its arguments through as they came.
		stream.write = ((...args: Parameters<Write>) => {
			clear();

			const [chunk] = args;
			if (chunk.length > 0) {
				atLineStart =
					typeof chunk === "string"
						? chunk.endsWith("\n")
						: chunk.at(-1) === 10;
			}

			const written = original.apply(stream, args);
			render();
			return written;
		}) as Write;
	};

	const spin = () => {
		hook(process.stdout, writes.stdout);
		hook(process.stderr, writes.stderr);

		timer = setInterval(() => {
			frame = (frame + 1) % frames.length;
			render();
		}, FRAME_MS);
		timer.unref();
		render();
	};

	const halt = () => {
		if (!timer) return;

		clearInterval(timer);
		timer = undefined;
		clear();

		process.stdout.write = writes.stdout;
		process.stderr.write = writes.stderr;
	};

	return {
		/** Shows a step, starting the spinner if it isn't running. */
		start: (text: string) => {
			if (!enabled) return;
			step = text;
			detail = "";

			if (paused) return;
			if (timer) render();
			else spin();
		},
		/** Adds detail to the current step while the spinner is running. */
		detail: (text: string) => {
			if (!timer) return;
			detail = stripVTControlCharacters(text).split("\n", 1)[0]?.trim() ?? "";
			render();
		},
		/** Stops the spinner and clears its line, including after a pause ends. */
		stop: () => {
			paused = false;
			halt();
		},
		/** Stops the spinner while `run` uses the terminal, such as for a prompt, then shows the same step again. */
		pause: async <Result>(run: () => Promise<Result>) => {
			if (!timer) return run();
			halt();
			paused = true;

			try {
				return await run();
			} finally {
				if (paused) {
					paused = false;
					spin();
				}
			}
		},
	};
};

const cliSpinner = createSpinner();

export default cliSpinner;
