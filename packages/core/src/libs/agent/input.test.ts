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
