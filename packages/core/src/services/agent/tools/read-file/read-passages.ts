import type z from "zod";
import {
	FILE_PAGE_CHARS,
	FILE_SEARCH_PASSAGES,
	SEARCH_CONTEXT_AFTER,
	SEARCH_CONTEXT_BEFORE,
} from "./constants.js";
import fitPassage from "./fit-passage.js";
import type { inputSchema, outputSchema } from "./schema.js";

type Output = z.output<typeof outputSchema>;

/**
 * Returns a page of text from `offset`, or the passages around search matches
 * after it. Both modes stay within the page and result budgets and set
 * `nextOffset` when there is more to read.
 */
const readPassages = ({
	text,
	input,
	file,
}: {
	text: string;
	input: z.output<typeof inputSchema>;
	file: Pick<Output, "mimeType" | "filename" | "contentType">;
}): Output => {
	const output: Output = {
		...file,
		mediaId: input.mediaId,
		mode: input.search === null ? "read" : "search",
		totalChars: text.length,
		passages: [],
		nextOffset: null,
		truncated: false,
	};

	if (input.search === null) {
		if (input.offset < text.length) {
			const page = fitPassage({
				text,
				output,
				offset: input.offset,
				end: text.length,
				maxChars: FILE_PAGE_CHARS,
			});
			output.passages.push(page);
			const end = page.offset + page.text.length;
			output.nextOffset = end < text.length ? end : null;
		}
	} else {
		//* any run of whitespace matches, so phrases wrapped across lines are still found
		const pattern = new RegExp(
			input.search
				.split(/\s+/)
				.map((word) => RegExp.escape(word))
				.join("\\s+"),
			"giu",
		);
		pattern.lastIndex = input.offset;
		let remaining = FILE_PAGE_CHARS;
		for (
			let match = pattern.exec(text);
			match !== null;
			match = pattern.exec(text)
		) {
			//* resume after the last passage, so the next match keeps its leading context
			const last = output.passages.at(-1);
			const resumeAt = last ? last.offset + last.text.length : match.index;
			if (output.passages.length === FILE_SEARCH_PASSAGES || remaining === 0) {
				output.nextOffset = resumeAt;
				break;
			}

			const found = fitPassage({
				text,
				output,
				offset: Math.max(input.offset, match.index - SEARCH_CONTEXT_BEFORE),
				end: match.index + match[0].length + SEARCH_CONTEXT_AFTER,
				maxChars: remaining,
			});
			if (found.offset + found.text.length < match.index + match[0].length) {
				output.nextOffset = resumeAt;
				break;
			}

			output.passages.push(found);
			remaining -= found.text.length;
			pattern.lastIndex = found.offset + found.text.length;
		}
	}

	output.truncated = output.nextOffset !== null;
	return output;
};

export default readPassages;
