import stringWidth from "string-width";

/**
 * Pads cells so columns line up in a terminal, measuring what shows rather than the colour
 * codes around it. The first row is the heading.
 */
const formatTable = (rows: string[][], gap = "  "): string => {
	const widths = rows[0]?.map((_, column) =>
		Math.max(...rows.map((row) => stringWidth(row[column] ?? ""))),
	);

	return rows
		.map((row) =>
			row
				.map(
					(cell, column) =>
						cell +
						" ".repeat(
							Math.max(0, (widths?.[column] ?? 0) - stringWidth(cell)),
						),
				)
				.join(gap)
				.trimEnd(),
		)
		.join("\n");
};

export default formatTable;
