import { expect, test } from "vitest";
import formatHtml from "./format-html.js";

test("puts each element on its own line, keeping text and inline tags together", () => {
	expect(
		formatHtml(
			'<form><div><label for="a">Name <span aria-hidden="true">*</span></label><input id="a"><textarea></textarea></div><button>Send</button></form>',
		),
	).toBe(
		[
			"<form>",
			"\t<div>",
			'\t\t<label for="a">Name <span aria-hidden="true">*</span></label>',
			'\t\t<input id="a">',
			"\t\t<textarea></textarea>",
			"\t</div>",
			"\t<button>Send</button>",
			"</form>",
		].join("\n"),
	);
});
