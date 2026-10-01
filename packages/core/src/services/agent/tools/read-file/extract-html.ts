import { compile, type DomNode } from "html-to-text";
import { MAX_FILE_BYTES } from "./constants.js";

const tableRows = (table: DomNode): DomNode[] =>
	table.children.flatMap((child) => {
		if (child.type !== "tag") return [];
		if (child.name === "tr") return [child];
		if (
			child.name === "thead" ||
			child.name === "tbody" ||
			child.name === "tfoot"
		) {
			return tableRows(child);
		}
		return [];
	});

/**
 * Converts HTML to readable text with link targets. Scripts and styles are
 * dropped, images keep only their alt text, and each table row becomes one
 * line with cells separated by " | ", so cells never run together.
 */
const extractHtml = compile({
	wordwrap: false,
	limits: { maxInputLength: MAX_FILE_BYTES },
	formatters: {
		imageAlt: (elem, _walk, builder) => {
			const alt: unknown = elem.attribs?.alt;
			if (typeof alt === "string" && alt.trim()) {
				builder.addInline(`[Image: ${alt.trim()}]`);
			}
		},
		pipeTable: (elem, walk, builder) => {
			builder.openTable();
			for (const row of tableRows(elem)) {
				builder.openTableRow();
				for (const cell of row.children) {
					if (cell.name !== "td" && cell.name !== "th") continue;
					builder.openTableCell();
					walk(cell.children, builder);
					builder.closeTableCell();
				}
				builder.closeTableRow();
			}
			builder.closeTable({
				leadingLineBreaks: 2,
				trailingLineBreaks: 2,
				tableToString: (rows) =>
					rows
						.map((cells) =>
							cells
								.map((cell) => cell.text.replace(/\s+/g, " ").trim())
								.join(" | "),
						)
						.join("\n"),
			});
		},
	},
	selectors: [
		{ selector: "script", format: "skip" },
		{ selector: "style", format: "skip" },
		{ selector: "img", format: "imageAlt" },
		{ selector: "table", format: "pipeTable" },
		...["h1", "h2", "h3", "h4", "h5", "h6"].map((selector) => ({
			selector,
			options: { uppercase: false },
		})),
	],
});

export default extractHtml;
