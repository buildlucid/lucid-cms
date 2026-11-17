/** Characters a spreadsheet reads as the start of a formula. */
const formulaStart = /^[=+\-@\t\r]/;

/**
 * Writes rows as CSV. Cells that would start a formula in a spreadsheet get a leading apostrophe,
 * as answers are typed by strangers.
 */
const toCsv = (rows: string[][]): string =>
	rows
		.map((row) =>
			row
				.map((cell) => {
					const safe = formulaStart.test(cell) ? `'${cell}` : cell;
					return /[",\r\n]/.test(safe)
						? `"${safe.replaceAll('"', '""')}"`
						: safe;
				})
				.join(","),
		)
		.join("\r\n");

export default toCsv;
