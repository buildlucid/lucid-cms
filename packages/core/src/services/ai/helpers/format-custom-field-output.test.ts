import { expect, test } from "vitest";
import TextCustomField from "../../../libs/collection/custom-fields/fields/text/custom-field.js";
import formatCustomFieldOutput from "./format-custom-field-output.js";

test("returns a service error for malformed generated content", () => {
	const result = formatCustomFieldOutput({
		field: new TextCustomField("title"),
		output: { kind: "translations", translations: { fr: "Bonjour" } },
		targetLocales: ["de"],
	});
	expect(result.data).toBeUndefined();
	expect(result.error).toMatchObject({ type: "basic", status: 502 });
	expect(result.error?.message).toBeDefined();
});
