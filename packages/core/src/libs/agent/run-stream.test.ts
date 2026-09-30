import { randomUUID } from "node:crypto";
import { expect, test, vi } from "vitest";
import {
	createRunStream,
	parseStreamCursor,
	savedStreamCursor,
} from "./run-stream.js";

test("replay retains ordered immutable events and rejects gaps and other publishers", () => {
	const stream = createRunStream({ events: 2, bytes: 10_000 });
	const event = {
		type: "text-delta" as const,
		messageId: randomUUID(),
		text: "first",
	};
	stream.publish(event);
	const first = stream.read(stream.initialCursor)?.[0];
	expect(first).toBeDefined();
	event.text = "changed";
	expect(first?.event).toMatchObject({ text: "first" });
	stream.publish({ ...event, text: "second" });
	stream.publish({ ...event, text: "third" });
	expect(stream.read(stream.initialCursor)).toBeUndefined();
	expect(
		stream.read(first?.id ?? "")?.map((entry) => entry.event),
	).toMatchObject([{ text: "second" }, { text: "third" }]);
	expect(stream.read(createRunStream().initialCursor)).toBeUndefined();
	expect(
		stream.read(stream.initialCursor.replace(/:0$/, ":100")),
	).toBeUndefined();
});

test("oversized events cause snapshot fallback and waiting viewers release abort listeners", async () => {
	const stream = createRunStream({ events: 2, bytes: 10 });
	stream.publish({
		type: "text-delta",
		messageId: randomUUID(),
		text: "too large",
	});
	expect(stream.read(stream.initialCursor)).toBeUndefined();
	const controller = new AbortController();
	const remove = vi.spyOn(controller.signal, "removeEventListener");
	const waiting = stream.wait(controller.signal);
	controller.abort();
	await waiting;
	expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
	stream.close();
	await stream.wait(new AbortController().signal);
	expect(stream.active).toBe(false);
});

test("saved cursors are scoped and reject malformed or unsafe sequence numbers", () => {
	const runId = randomUUID();
	expect(
		parseStreamCursor(
			savedStreamCursor(runId, { executionVersion: 2, revision: 7 }),
		),
	).toEqual({
		kind: "saved",
		runId,
		executionVersion: 2,
		revision: 7,
	});
	for (const cursor of [
		undefined,
		"",
		`live:${runId}:`,
		`live:${runId}:-1`,
		`live:${runId}:9007199254740992`,
		`saved:${runId}:1:2:3`,
	]) {
		expect(parseStreamCursor(cursor)).toBeUndefined();
	}
});
