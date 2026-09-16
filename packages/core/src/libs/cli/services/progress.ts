import picocolors from "picocolors";

const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
type WriteCallback = (error?: Error | null) => void;

/** Keeps a single progress line below stdout and stderr until the command is ready. */
export const startProgress = (initialText: string, silent = false) => {
	if (
		silent ||
		!process.stdout.isTTY ||
		process.env.CI ||
		process.env.TERM === "dumb"
	) {
		return {
			update: (_text: string) => {},
			pause: () => () => {},
			stop: () => {},
		};
	}

	const stdoutWrite = process.stdout.write;
	const stderrWrite = process.stderr.write;
	const write = stdoutWrite.bind(process.stdout);
	const startedAt = Date.now();
	let text = initialText;
	let frame = 0;
	let visible = false;
	let lineOpen = false;
	let stopped = false;
	let paused = false;

	const clear = () => {
		if (!visible) return;
		write("\r\u001b[2K");
		visible = false;
	};

	const render = () => {
		if (stopped || paused || lineOpen) return;
		clear();
		const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
		const line = `${frames[frame++ % frames.length]} ${text} ${elapsed}s`;
		write(
			picocolors.cyan(
				line.slice(0, Math.max(0, (process.stdout.columns || 80) - 1)),
			),
		);
		visible = true;
	};

	const intercept = (stream: NodeJS.WriteStream) => {
		const original = stream.write.bind(stream);

		function output(
			chunk: string | Uint8Array,
			callback?: WriteCallback,
		): boolean;
		function output(
			chunk: string | Uint8Array,
			encoding: BufferEncoding | undefined,
			callback?: WriteCallback,
		): boolean;
		function output(
			chunk: string | Uint8Array,
			encodingOrCallback?: BufferEncoding | WriteCallback,
			callback?: WriteCallback,
		) {
			clear();

			const result =
				typeof encodingOrCallback === "string"
					? original(chunk, encodingOrCallback, callback)
					: original(chunk, encodingOrCallback ?? callback);

			if (paused) return result;

			const content =
				typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
			if (content.length > 0) lineOpen = !content.endsWith("\n");

			render();
			return result;
		}

		stream.write = output;
		return output;
	};

	const stdoutOutput = intercept(process.stdout);
	const stderrOutput = intercept(process.stderr);

	const stop = () => {
		if (stopped) return;
		stopped = true;
		clearInterval(timer);
		clear();

		if (process.stdout.write === stdoutOutput) {
			process.stdout.write = stdoutWrite;
		}
		if (process.stderr.write === stderrOutput) {
			process.stderr.write = stderrWrite;
		}

		process.off("exit", stop);
		process.off("SIGINT", interrupt);
		process.off("SIGTERM", terminate);
	};

	const onSignal = (signal: "SIGINT" | "SIGTERM") => {
		stop();
		// Preserve existing shutdown handlers, or let Node handle the signal normally.
		if (process.listenerCount(signal) === 0) process.kill(process.pid, signal);
	};

	const interrupt = () => onSignal("SIGINT");
	const terminate = () => onSignal("SIGTERM");

	const timer = setInterval(render, 80);

	timer.unref();
	process.once("exit", stop);
	process.prependOnceListener("SIGINT", interrupt);
	process.prependOnceListener("SIGTERM", terminate);

	render();

	return {
		update: (nextText: string) => {
			text = nextText;
			render();
		},
		pause: () => {
			paused = true;
			clear();
			return () => {
				paused = false;
				lineOpen = false;
				render();
			};
		},
		stop,
	};
};
