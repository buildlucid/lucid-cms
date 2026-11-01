import { afterEach, describe, expect, it } from "vitest";
import { focusField } from "./focus-field";

describe("focusField", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("focuses the element with the id when it can take focus", () => {
		document.body.innerHTML = `<input id="title" />`;

		focusField("title");

		expect(document.activeElement?.id).toBe("title");
	});

	it("focuses the first enabled control inside a wrapper", () => {
		document.body.innerHTML = `
			<div id="media">
				<button id="disabled" disabled></button>
				<button id="select"></button>
			</div>
		`;

		focusField("media");

		expect(document.activeElement?.id).toBe("select");
	});
});
