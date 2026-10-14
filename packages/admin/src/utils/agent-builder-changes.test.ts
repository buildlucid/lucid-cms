import type { AgentBuilderChangesData } from "@lucidcms/types";
import type { AgentMessage, DocumentVersionCheckBrick } from "@types";
import { describe, expect, it } from "vitest";
import {
	applyBuilderChanges,
	builderContentKeys,
	changeTarget,
	mergeBuilderChanges,
	replyBuilderChanges,
	updateConflicts,
} from "./agent-builder-changes";

const hero = (ref: string, heading: string, order: number) =>
	({
		ref,
		key: "hero",
		type: "builder",
		order,
		open: true,
		fields: [{ key: "heading", type: "text", translations: { en: heading } }],
	}) satisfies DocumentVersionCheckBrick;

describe("applyBuilderChanges", () => {
	it("replaces only what changed, keeping the builder's other edits and open bricks", () => {
		const seo = {
			ref: "seo",
			key: "seo",
			type: "fixed",
			order: 0,
			fields: [],
		} satisfies DocumentVersionCheckBrick;
		const title = { key: "title", type: "text" as const, value: "Edited" };

		const next = applyBuilderChanges(
			{
				fields: [title, { key: "slug", type: "text", value: "old" }],
				bricks: [seo, hero("a", "Person's edit", 0), hero("b", "Two", 1)],
			},
			{
				fields: [{ key: "slug", type: "text", value: "new" }],
				bricks: [
					{ ...hero("b", "From the agent", 0), open: undefined },
					hero("c", "New", 1),
				],
				removed: [],
				order: ["b", "c", "a"],
			},
		);

		expect(next.fields).toEqual([
			title,
			{ key: "slug", type: "text", value: "new" },
		]);
		expect(next.bricks).toEqual([
			seo,
			{ ...hero("b", "From the agent", 0), open: true },
			hero("c", "New", 1),
			hero("a", "Person's edit", 2),
		]);
	});
});

describe("mergeBuilderChanges", () => {
	const document = {
		collectionKey: "pages",
		documentId: 1,
		requestId: null,
	};

	it("lists each brick once across a reply's updates", () => {
		const merged = mergeBuilderChanges([
			{
				document,
				changes: [
					{
						brick: null,
						status: "changed",
						moved: false,
						fields: [{ path: ["title"], locales: ["en"] }],
					},
					{
						brick: { type: "builder", key: "hero", ref: "a" },
						status: "added",
						moved: false,
						fields: [],
					},
				],
			},
			{
				document,
				changes: [
					{
						brick: null,
						status: "changed",
						moved: false,
						fields: [{ path: ["title"], locales: ["fr"] }],
					},
					{
						brick: { type: "builder", key: "hero", ref: "a" },
						status: "removed",
						moved: false,
						fields: [],
					},
				],
			},
		] satisfies AgentBuilderChangesData[]);

		expect(merged).toEqual([
			{
				document,
				changes: [
					{
						brick: null,
						status: "changed",
						moved: false,
						fields: [{ path: ["title"], locales: ["en", "fr"] }],
					},
				],
			},
		]);
	});
});

describe("replyBuilderChanges", () => {
	const update = (ref: string): AgentBuilderChangesData => ({
		document: {
			collectionKey: "pages",
			documentId: 1,
			requestId: null,
		},
		changes: [
			{
				brick: { type: "builder", key: "hero", ref },
				status: "added",
				moved: false,
				fields: [],
			},
		],
	});
	const message = (
		id: string,
		runId: string | null,
		data?: AgentBuilderChangesData,
	): AgentMessage => ({
		id,
		conversationId: "chat",
		runId,
		position: 0,
		role: "assistant",
		createdAt: null,
		parts: data
			? [{ type: "widget", key: "lucid-builder-changes", version: 1, data }]
			: [{ type: "text", text: "Done" }],
	});

	it("shows a reply's changes from every turn after its last message, once the agent stops working on it", () => {
		const messages = [
			message("1", "run", update("a")),
			message("2", "run", update("b")),
			message("3", "run"),
			message("4", "working", update("c")),
		];

		const shown = replyBuilderChanges(messages, "working");
		expect([...shown.keys()]).toEqual(["3"]);
		expect(shown.get("3")?.[0]?.changes).toHaveLength(2);
	});
	it("groups a branch's copied turns by reply, as they have no run", () => {
		const shown = replyBuilderChanges(
			[
				message("1", null, update("a")),
				message("2", null, update("b")),
				{ ...message("3", null), role: "user" },
				message("4", null, update("c")),
			],
			undefined,
		);
		expect([...shown.keys()]).toEqual(["2", "4"]);
		expect(shown.get("2")?.[0]?.changes).toHaveLength(2);
	});
});

describe("changeTarget", () => {
	it("shows fields in the language they changed in, and nothing for bricks that are gone", () => {
		const field = { path: ["heading"], locales: ["fr"] };
		const change = {
			brick: { type: "fixed" as const, key: "seo", ref: "x1" },
			status: "changed" as const,
			moved: false,
			fields: [field],
		};

		expect(changeTarget(change, field, "en")).toEqual({
			brick: "seo",
			path: ["heading"],
			contentLocale: "fr",
		});
		expect(changeTarget(change, field, "fr")?.contentLocale).toBeUndefined();
		//* a fixed brick has no header to show
		expect(changeTarget(change)).toBeUndefined();
		expect(
			changeTarget({ ...change, status: "removed" }, field, "en"),
		).toBeUndefined();
	});
});

describe("updateConflicts", () => {
	const keys = (title: string, slug: string, heading: string) =>
		builderContentKeys([
			{
				ref: "collection-pseudo-brick",
				type: "collection-fields",
				fields: [
					{ key: "title", type: "text", value: title },
					{ key: "slug", type: "text", value: slug },
				],
			},
			{
				ref: "a",
				type: "builder",
				fields: [{ key: "heading", type: "text", value: heading }],
			},
		]);
	const slugUpdate = {
		fields: [{ key: "slug", type: "text" as const, value: "new" }],
		bricks: [],
		removed: [],
		order: null,
	};
	const read = keys("Title", "old", "Hello");

	it("lets an update through when the person edited other fields or bricks", () => {
		expect(
			updateConflicts(read, keys("Edited", "old", "Edited"), slugUpdate),
		).toBe(false);
	});

	it("refuses an update to a field the person edited since the read", () => {
		expect(
			updateConflicts(read, keys("Title", "mine", "Hello"), slugUpdate),
		).toBe(true);
	});
});
