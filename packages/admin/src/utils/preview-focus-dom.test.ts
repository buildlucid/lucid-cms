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

test("activating a field presses its own picker, or else focuses its own input", async () => {
	document.body.innerHTML = `
		<div id="media" data-preview-focus-field>
			<button type="button" data-field-action id="pick">Select media</button>
		</div>
		<div id="title" data-preview-focus-field>
			<div data-preview-focus-field>
				<button type="button" data-field-action>Nested picker</button>
			</div>
			<input id="title-input" />
		</div>
	`;
	let picked = 0;
	document.getElementById("pick")?.addEventListener("click", () => {
		picked += 1;
	});

	await revealPreviewField({
		fieldId: "media",
		structureIds: [],
		signal: new AbortController().signal,
		activate: true,
	});
	await revealPreviewField({
		fieldId: "title",
		structureIds: [],
		signal: new AbortController().signal,
		activate: true,
	});

	expect(picked).toBe(1);
	expect(document.activeElement?.id).toBe("title-input");
});
