import { describe, expect, test } from "vitest";
import renderTokens from "./render-tokens.js";

describe("renderTokens", () => {
	test("fills in answers and removes tokens that name none", () => {
		expect(
			renderTokens("Hi {{ name }}, re {{topic}}{{missing}}", {
				name: "Ada",
				topic: "sales",
			}),
		).toBe("Hi Ada, re sales");
	});

	test("removes tokens named after what every object has", () => {
		expect(renderTokens("{{constructor}}{{toString}}Hi", { name: "Ada" })).toBe(
			"Hi",
		);
	});

	test("keeps an answer's line breaks out of single lines, so it can't add email headers", () => {
		const answers = { name: "Ada\r\nBcc: everyone@example.com" };

		expect(renderTokens("From {{name}}", answers)).toBe(
			"From Ada Bcc: everyone@example.com",
		);
		expect(renderTokens("{{name}}", answers, { multiline: true })).toBe(
			answers.name,
		);
	});
});
