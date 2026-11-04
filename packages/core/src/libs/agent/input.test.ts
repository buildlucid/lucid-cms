import { expect, test } from "vitest";
import { messageText } from "./input.js";

test("messages tell the model when they were sent, in local time, and who the run acts for", () => {
	const context = {
		type: "context" as const,
		sentAt: "2026-10-14T09:12:00.000Z",
		timezone: "Europe/London",
	};

	const text = messageText([
		{ type: "text", text: "Chase stale comments" },
		{ ...context, actingFor: { userId: 4, name: "Sam Lee" } },
	]);
	expect(text).toMatch(
		/^Chase stale comments\n\n<message_context sent_at="2026-10-14T09:12:00.000Z" /,
	);
	//* the exact wording comes from the runtime's date formatting
	expect(text).toMatch(/local_time="Wednesday,? 14 October 2026 at 10:12"/);
	expect(text).toContain(
		'timezone="Europe/London" acting_for="Sam Lee" acting_for_user_id="4" />',
	);
	expect(messageText([{ ...context, actingFor: null }])).toContain(
		'acting_for="system"',
	);
});

test("an attached document's focus names the brick and field the person picked", () => {
	const text = messageText([
		{ type: "text", text: "Make this punchier" },
		{
			type: "reference",
			reference: {
				type: "document",
				collectionKey: "page",
				documentId: 3,
				label: "Home",
				focus: {
					brick: "Xy12ab",
					path: ["items", "Cd34ef", "title"],
					label: "Hero › Items 2 › Title",
				},
			},
		},
		{
			type: "reference",
			reference: {
				type: "document",
				collectionKey: "page",
				documentId: 3,
				label: "Home",
				focus: { brick: "Gh56ij", path: [], label: "FAQ" },
			},
		},
	]);
	expect(text).toContain(
		'<attachment type="document" collection_key="page" document_id="3" name="Home" focus="Hero › Items 2 › Title" brick="Xy12ab" field_path="items/Cd34ef/title" />',
	);
	expect(text).toContain(
		'<attachment type="document" collection_key="page" document_id="3" name="Home" focus="FAQ" brick="Gh56ij" />',
	);
});
