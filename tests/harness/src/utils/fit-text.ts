import cliTruncate from "cli-truncate";
import stringWidth from "string-width";

/**
 * Cuts text that may hold colours to `width` columns and pads it to exactly that width, so
 * columns line up in a terminal. `position` says where to cut a long line.
 */
const fitText = (
	text: string,
	width: number,
	position: "end" | "middle" | "start" = "end",
): string => {
	if (width <= 0) {
		return "";
	}
	const cut = cliTruncate(text, width, { position });
	return cut + " ".repeat(Math.max(0, width - stringWidth(cut)));
};

export default fitText;
