/** Quotes a command-line argument for a POSIX shell, leaving plain words as they are. */
const quoteArgument = (value: string): string =>
	/^[\w./:@=,+-]+$/.test(value) ? value : `'${value.replaceAll("'", `'\\''`)}'`;

export default quoteArgument;
