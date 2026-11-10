/** Pads cells so columns line up in a terminal. The first row is the heading. */
const formatTable = (rows: string[][]): string => {
	const widths = rows[0]?.map((_, column) =>
		Math.max(...rows.map((row) => row[column]?.length ?? 0)),
	);

	return rows
		.map((row) =>
			row
				.map((cell, column) => cell.padEnd(widths?.[column] ?? 0))
				.join("  ")
				.trimEnd(),
		)
		.join("\n");
};

export default formatTable;
