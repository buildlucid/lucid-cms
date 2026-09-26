/** Removes shared indentation so indented template literals stay valid markdown. */
const dedent = (text: string) => {
	const lines = text.split("\n");
	const indent = Math.min(
		...lines
			.filter((line) => line.trim())
			.map((line) => line.length - line.trimStart().length),
	);

	return lines
		.map((line) => line.slice(indent))
		.join("\n")
		.trim();
};

export default dedent;
