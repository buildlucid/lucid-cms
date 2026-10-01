import type z from "zod";
import { FILE_RESULT_CHARS } from "./constants.js";
import type { outputSchema } from "./schema.js";

const isHighSurrogate = (character: string) =>
	/[\uD800-\uDBFF]/.test(character);
const isLowSurrogate = (character: string) => /[\uDC00-\uDFFF]/.test(character);

/**
 * Slices the longest passage from `offset` towards `end`, up to `maxChars`,
 * that keeps the serialised result within FILE_RESULT_CHARS once added to
 * `output`. Room is left for the continuation fields, and surrogate pairs are
 * never split.
 */
const fitPassage = (props: {
	text: string;
	output: z.output<typeof outputSchema>;
	offset: number;
	end: number;
	maxChars: number;
}) => {
	const { text, output } = props;
	let offset = props.offset;
	if (
		offset > 0 &&
		isLowSurrogate(text.charAt(offset)) &&
		isHighSurrogate(text.charAt(offset - 1))
	) {
		offset--;
	}

	//* binary search, since JSON escaping makes the serialised length uneven
	let start = offset;
	let limit = Math.min(props.end, text.length, offset + props.maxChars);
	while (start < limit) {
		const middle = Math.ceil((start + limit) / 2);
		const length = JSON.stringify({
			...output,
			passages: [
				...output.passages,
				{ offset, text: text.slice(offset, middle) },
			],
			nextOffset: text.length,
			truncated: false,
		}).length;
		if (length <= FILE_RESULT_CHARS) start = middle;
		else limit = middle - 1;
	}

	if (
		start > offset &&
		isHighSurrogate(text.charAt(start - 1)) &&
		isLowSurrogate(text.charAt(start))
	) {
		start--;
	}

	return { offset, text: text.slice(offset, start) };
};

export default fitPassage;
