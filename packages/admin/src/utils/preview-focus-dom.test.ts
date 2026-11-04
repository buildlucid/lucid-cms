import { afterEach, expect, test } from "vitest";
import { revealPreviewField } from "./preview-focus-dom";

afterEach(() => {
	document.body.replaceChildren();
});

test("points out a repeater group by its title, not its repeater's label", async () => {
	document.body.innerHTML = `
		<div data-preview-focus-field>
			<h3 data-preview-focus-label>Links</h3>
			<div id="group" data-preview-focus-open="true">
				<h3 data-preview-focus-label id="title">Call to action</h3>
				<button type="button">Remove</button>
			</div>
		</div>
	`;

	await revealPreviewField({
		fieldId: "group",
		structureIds: [],
		signal: new AbortController().signal,
	});

	expect(document.querySelector(".preview-field-target-highlight")?.id).toBe(
		"title",
	);
});
