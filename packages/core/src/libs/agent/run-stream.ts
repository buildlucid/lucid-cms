import { randomUUID } from "node:crypto";
import z from "zod";
import constants from "../../constants/constants.js";
import type { ResolvedLucidConfig } from "../../types/config.js";
import type { AgentStreamEvent } from "../../types/response.js";

const integer = z
	.string()
	.regex(/^\d+$/)
	.pipe(
		z.coerce.number<string>().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
	);
const liveCursor = z.tuple([z.literal("live"), z.uuid(), integer]);
const savedCursor = z.tuple([z.literal("saved"), z.uuid(), integer, integer]);
const encoder = new TextEncoder();

export type SavedMessageCursor = {
	executionVersion: number;
	revision: number;
};

/** Cursors are scoped to a run or a live publisher. Invalid or expired cursors use saved snapshots. */
export const parseStreamCursor = (value: string | undefined) => {
	if (!value || value.length > 128) return undefined;

	const parts = value.split(":");

	const live = liveCursor.safeParse(parts);
	if (live.success) {
		return {
			kind: "live" as const,
			epoch: live.data[1],
			sequence: live.data[2],
		};
	}

	const saved = savedCursor.safeParse(parts);
	if (saved.success) {
		return {
			kind: "saved" as const,
			runId: saved.data[1],
			executionVersion: saved.data[2],
			revision: saved.data[3],
		};
	}

	return undefined;
};

export const savedStreamCursor = (runId: string, cursor: SavedMessageCursor) =>
	`saved:${runId}:${cursor.executionVersion}:${cursor.revision}`;

/** A replay buffer has one publisher and no per-viewer queues. Slow or returning viewers use saved snapshots after a gap. */
export const createRunStream = (
	limits: { events: number; bytes: number } = constants.agent.streamReplay,
) => {
	const epoch = randomUUID();
	const entries: {
		id: string;
		event: AgentStreamEvent;
		bytes: number;
		sequence: number;
	}[] = [];
	const listeners = new Set<() => void>();
	let sequence = 0;
	let bytes = 0;
	let active = true;
	let touchedAt = Date.now();

	const notify = () => {
		for (const listener of listeners) listener();
	};

	return {
		initialCursor: `live:${epoch}:0`,
		get active() {
			return active;
		},
		get touchedAt() {
			return touchedAt;
		},
		publish: (event: AgentStreamEvent) => {
			const value = structuredClone(event);
			const size = encoder.encode(JSON.stringify(value)).byteLength;

			entries.push({
				id: `live:${epoch}:${++sequence}`,
				event: value,
				bytes: size,
				sequence,
			});
			bytes += size;

			while (entries.length > limits.events || bytes > limits.bytes) {
				const removed = entries.shift();
				if (removed) bytes -= removed.bytes;
			}

			touchedAt = Date.now();
			notify();
		},
		read: (id: string) => {
			const cursor = parseStreamCursor(id);
			const oldest = entries[0]?.sequence ?? sequence + 1;
			if (
				cursor?.kind !== "live" ||
				cursor.epoch !== epoch ||
				cursor.sequence > sequence ||
				cursor.sequence < oldest - 1
			) {
				return undefined;
			}

			return entries.filter((entry) => entry.sequence > cursor.sequence);
		},
		wait: (signal: AbortSignal) =>
			new Promise<void>((resolve) => {
				if (signal.aborted || !active) return resolve();

				const done = () => {
					listeners.delete(done);
					signal.removeEventListener("abort", done);
					resolve();
				};
				listeners.add(done);
				signal.addEventListener("abort", done, { once: true });
			}),
		close: () => {
			active = false;
			touchedAt = Date.now();
			notify();
		},
	};
};

export type RunStream = ReturnType<typeof createRunStream>;

const streams = new WeakMap<ResolvedLucidConfig, Map<string, RunStream>>();

const registry = (config: ResolvedLucidConfig) => {
	let runs = streams.get(config);
	if (!runs) {
		runs = new Map();
		streams.set(config, runs);
	}

	for (const [id, stream] of runs) {
		const expired =
			Date.now() - stream.touchedAt > constants.agent.streamReplay.retentionMs;
		if (!stream.active && expired) runs.delete(id);
	}

	return runs;
};

/** Each execution slice gets a new epoch; an old worker cannot publish into its replacement's buffer. */
export const startRunStream = (config: ResolvedLucidConfig, runId: string) => {
	const runs = registry(config);
	const stream = createRunStream();

	runs.delete(runId);
	runs.set(runId, stream);

	while (runs.size > constants.agent.streamReplay.runs) {
		const oldest = runs.keys().next().value;
		if (oldest !== undefined) runs.delete(oldest);
	}

	return stream;
};

export const findRunStream = (config: ResolvedLucidConfig, runId: string) =>
	registry(config).get(runId);
