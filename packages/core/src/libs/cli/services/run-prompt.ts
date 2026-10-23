import { Writable } from "node:stream";
import cliSpinner from "../spinner.js";

type Write = typeof process.stdout.write;

/** Pauses the spinner while `prompt` uses a stream sized to the terminal, buffering other writes until the prompt closes. */
const runPrompt = <Result>(
	prompt: (output: NodeJS.WritableStream) => Promise<Result>,
) =>
	// The spinner restores the terminal's own writes when it pauses, so they're read once it has.
	cliSpinner.pause(async () => {
		const writes = {
			stdout: process.stdout.write,
			stderr: process.stderr.write,
		};
		const held: Array<() => void> = [];
		const hold = (stream: NodeJS.WriteStream, original: Write) => {
			// `write` is overloaded, so held writes pass their arguments on as they came.
			stream.write = ((...args: Parameters<Write>) => {
				held.push(() => original.apply(stream, args));
				return true;
			}) as Write;
		};
		// Prompts size themselves to the terminal, so the stream reports the terminal's.
		const output = Object.assign(
			new Writable({
				write: (chunk: Uint8Array, _encoding, callback) => {
					writes.stdout.call(process.stdout, chunk);
					callback();
				},
			}),
			{
				isTTY: true,
				columns: process.stdout.columns,
				rows: process.stdout.rows,
			},
		);

		hold(process.stdout, writes.stdout);
		hold(process.stderr, writes.stderr);
		try {
			return await prompt(output);
		} finally {
			process.stdout.write = writes.stdout;
			process.stderr.write = writes.stderr;
			for (const write of held) write();
		}
	});

export default runPrompt;
