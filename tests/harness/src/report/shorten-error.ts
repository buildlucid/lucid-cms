/** How many lines of an error a terminal shows. */
const MAX_LINES = 6;

/** Keeps an error's message and causes but drops stack frames, so it stays short in a terminal. */
const shortenError = (error: string): string[] =>
	error
		.split("\n")
		.filter((line) => line.trim() !== "" && !/^\s+at /.test(line))
		.slice(0, MAX_LINES);

export default shortenError;
