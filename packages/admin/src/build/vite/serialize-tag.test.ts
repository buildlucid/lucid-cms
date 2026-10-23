import { expect, test } from "vitest";
import serializeTag from "./serialize-tag.js";

test("serializes extension tags with escaped attributes", () => {
	expect(
		serializeTag({
			tag: "script",
			attrs: { src: 'https://cdn.example.com/a.js?x=1&y="2"', defer: true },
		}),
	).toBe(
		'<script src="https://cdn.example.com/a.js?x=1&amp;y=&quot;2&quot;" defer></script>',
	);
	expect(
		serializeTag({
			tag: "link",
			attrs: { rel: "stylesheet", href: "https://cdn.example.com/a.css" },
		}),
	).toBe('<link rel="stylesheet" href="https://cdn.example.com/a.css">');
});
