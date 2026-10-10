import type {
	AgentBuilderChange,
	AgentBuilderChangesData,
	AgentBuilderContent,
	AgentBuilderContentChanges,
	AgentBuilderFieldChange,
	AgentMessage,
} from "@types";
import type { AgentBuilderFocus } from "@/hooks/useAgentSession/useAgentSession";
import type { BrickSnapshot } from "@/store/brickStore/utils/snapshots";
import {
	builderChangesWidget,
	isBuilderChangesData,
	isWidgetSupported,
} from "@/utils/agent-tools";

/** The builder's content as the person sees it, to tell which parts changed between a read and an update. */
export type BuilderContentKeys = {
	/** The document's own fields, by key. */
	fields: Map<string, string>;
	/** Bricks' fields, by ref. */
	bricks: Map<string, string>;
	/** The builder bricks' refs in order. */
	order: string;
};

/** Keys the builder's content, from a snapshot that leaves out whether bricks and groups are open. */
export const builderContentKeys = (
	snapshot: Array<Pick<BrickSnapshot, "ref" | "type" | "fields">>,
): BuilderContentKeys => {
	const fields = new Map<string, string>();
	const bricks = new Map<string, string>();
	const order: string[] = [];
	for (const brick of snapshot) {
		if (brick.type === "collection-fields") {
			for (const field of brick.fields) {
				fields.set(field.key, JSON.stringify(field));
			}
			continue;
		}

		bricks.set(brick.ref, JSON.stringify(brick.fields));
		if (brick.type === "builder") order.push(brick.ref);
	}
	return { fields, bricks, order: order.join("\n") };
};

/** Detects edits since the read to fields, bricks or ordering affected by the update, allowing unrelated edits. */
export const updateConflicts = (
	read: BuilderContentKeys,
	current: BuilderContentKeys,
	changes: AgentBuilderContentChanges,
) => {
	const edited = (
		before: Map<string, string>,
		after: Map<string, string>,
		keys: string[],
	) =>
		keys.some((key) => before.has(key) && before.get(key) !== after.get(key));

	return (
		edited(
			read.fields,
			current.fields,
			changes.fields.map((field) => field.key),
		) ||
		edited(read.bricks, current.bricks, [
			...changes.bricks.map((brick) => brick.ref),
			...changes.removed,
		]) ||
		(changes.order !== null && read.order !== current.order)
	);
};

/** Applies an update's changed fields and bricks to the builder's content, keeping everything else as the builder has it. */
export const applyBuilderChanges = (
	content: AgentBuilderContent,
	changes: AgentBuilderContentChanges,
): AgentBuilderContent => {
	const fields = new Map(changes.fields.map((field) => [field.key, field]));
	const bricks = new Map(changes.bricks.map((brick) => [brick.ref, brick]));
	const removed = new Set(changes.removed);
	const order = new Map(changes.order?.map((ref, index) => [ref, index]));

	const next = [
		//* kept bricks keep their place and editor state, taking only the new fields
		...content.bricks.flatMap((brick) => {
			if (removed.has(brick.ref)) return [];
			const changed = bricks.get(brick.ref);
			return [changed ? { ...brick, fields: changed.fields } : brick];
		}),
		...changes.bricks.filter(
			(brick) => !content.bricks.some((current) => current.ref === brick.ref),
		),
	].map((brick) => {
		const position = order.get(brick.ref);
		return brick.type === "builder" && position !== undefined
			? { ...brick, order: position }
			: brick;
	});
	//* builder bricks fill the places builder bricks had, in their new order
	const builders = next
		.filter((brick) => brick.type === "builder")
		.toSorted((a, b) => a.order - b.order);
	let builderIndex = 0;

	return {
		fields: [
			...content.fields.map((field) => fields.get(field.key) ?? field),
			...changes.fields.filter(
				(field) => !content.fields.some((current) => current.key === field.key),
			),
		],
		bricks: next.map((brick) =>
			brick.type === "builder" ? (builders[builderIndex++] ?? brick) : brick,
		),
	};
};

/** Targets a changed field or builder brick header, omitting removed and embedded bricks and switching languages when only another language changed. */
export const changeTarget = (
	change: AgentBuilderChange,
	field?: AgentBuilderFieldChange,
	contentLocale?: string,
): AgentBuilderFocus | undefined => {
	const brick = change.brick;
	if (change.status === "removed" || brick?.type === "embedded") {
		return undefined;
	}
	if (!field) {
		return brick?.type === "builder"
			? { brick: brick.ref, path: [] }
			: undefined;
	}

	return {
		brick: brick?.type === "fixed" ? brick.key : brick?.ref,
		path: field.path,
		contentLocale:
			contentLocale && field.locales.includes(contentLocale)
				? undefined
				: field.locales[0],
	};
};

const mergeFieldChanges = (
	prior: AgentBuilderFieldChange[],
	next: AgentBuilderFieldChange[],
) => {
	const merged = new Map(prior.map((field) => [field.path.join("/"), field]));
	for (const field of next) {
		const key = field.path.join("/");
		const existing = merged.get(key);
		merged.set(
			key,
			existing
				? {
						path: field.path,
						locales: [...new Set([...existing.locales, ...field.locales])],
					}
				: field,
		);
	}
	return [...merged.values()];
};

/** Combines a reply's builder updates into one list per document, so a brick changed more than once shows once. */
export const mergeBuilderChanges = (
	updates: AgentBuilderChangesData[],
): AgentBuilderChangesData[] => {
	const documents = new Map<
		string,
		{
			document: AgentBuilderChangesData["document"];
			changes: Map<string, AgentBuilderChange>;
		}
	>();

	for (const update of updates) {
		const { collectionKey, documentId, requestId } = update.document;
		const key = `${collectionKey}:${documentId}:${requestId}`;
		const entry = documents.get(key) ?? {
			document: update.document,
			changes: new Map(),
		};
		//* the latest label, as the agent may have renamed the document
		entry.document = update.document;
		documents.set(key, entry);

		for (const change of update.changes) {
			const id = change.brick?.ref ?? "";
			const prior = entry.changes.get(id);
			if (!prior) {
				entry.changes.set(id, change);
			} else if (change.status === "removed") {
				//* a brick added and removed again in the same reply never happened
				if (prior.status === "added") {
					entry.changes.delete(id);
				} else {
					entry.changes.set(id, change);
				}
			} else if (prior.status === "changed") {
				entry.changes.set(id, {
					...prior,
					moved: prior.moved || change.moved,
					fields: mergeFieldChanges(prior.fields, change.fields),
				});
			}
		}
	}

	return [...documents.values()].flatMap((entry) =>
		entry.changes.size
			? [{ document: entry.document, changes: [...entry.changes.values()] }]
			: [],
	);
};

/** Groups model turns by run and keys each completed reply's merged builder changes by its last message, hiding the active run's changes. */
export const replyBuilderChanges = (
	messages: AgentMessage[],
	workingRunId: string | undefined,
) => {
	const replies = new Map<
		string,
		{ lastMessageId: string; updates: AgentBuilderChangesData[] }
	>();
	for (const message of messages) {
		if (message.role !== "assistant") continue;
		const runId = message.runId ?? message.id;
		const reply = replies.get(runId) ?? {
			lastMessageId: message.id,
			updates: [],
		};
		reply.lastMessageId = message.id;
		for (const part of message.parts) {
			if (
				part.type === "widget" &&
				part.key === builderChangesWidget &&
				isWidgetSupported(part) &&
				isBuilderChangesData(part.data)
			) {
				reply.updates.push(part.data);
			}
		}
		replies.set(runId, reply);
	}

	const shown = new Map<string, AgentBuilderChangesData[]>();
	for (const [runId, reply] of replies) {
		if (runId === workingRunId) continue;
		const changes = mergeBuilderChanges(reply.updates);
		if (changes.length) shown.set(reply.lastMessageId, changes);
	}
	return shown;
};
