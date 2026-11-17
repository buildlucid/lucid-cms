import { describe, expect, test } from "vitest";
import toCsv from "./to-csv.js";

describe("toCsv", () => {
	test("quotes cells that hold commas, quotes or line breaks", () => {
		expect(toCsv([["a,b", 'say "hi"', "two\nlines", "plain"]])).toBe(
			'"a,b","say ""hi""","two\nlines",plain',
		);
	});

	test("stops answers running as formulas in a spreadsheet", () => {
		expect(toCsv([["=1+1", "+44 20", "-5", "@user", "safe=1"]])).toBe(
			"'=1+1,'+44 20,'-5,'@user,safe=1",
		);
	});
});
