import { expect, test, vi } from "vitest";
import type { LucidConfig } from "../../types/config.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import { passthroughEmailAdapterInstance } from "../email/adapters/passthrough.js";
import { getInitializedEmailAdapter } from "../email/lifecycle.js";
import passthroughKVAdapter from "../kv/adapters/passthrough.js";
import passthroughMediaDeliveryAdapter from "../media-delivery/adapters/passthrough.js";
import type { MediaStorageAdapterInstance } from "../media-storage/types.js";
import type { QueueAdapterInstance } from "../queue/types.js";
import mergeConfig from "./merge-config.js";
import processConfig from "./process-config.js";

const unusedStorageOperation = async () => {
	throw new Error("Storage is not used during config merging");
};
const storage: MediaStorageAdapterInstance = {
	type: "media-storage-adapter",
	key: "test",
	createUploadSession: unusedStorageOperation,
	getDownloadUrl: unusedStorageOperation,
	getMeta: unusedStorageOperation,
	stream: unusedStorageOperation,
	upload: unusedStorageOperation,
	delete: unusedStorageOperation,
	deleteMultiple: unusedStorageOperation,
	rename: unusedStorageOperation,
};

test("replaces each exclusive provider as a whole instance while merging its options", () => {
	const lifecycle = { init: vi.fn(async () => {}) };
	const queue: QueueAdapterInstance = {
		type: "queue-adapter",
		key: "test",
		support: { delayedDelivery: false },
		publish: async () => ({ error: undefined, data: undefined }),
	};
	const project = {
		media: {
			storage,
			delivery: passthroughMediaDeliveryAdapter(),
			limits: { uploadBytes: 20 },
		},
		email: {
			adapter: { ...passthroughEmailAdapterInstance },
			from: { email: "project@example.com" },
		},
		kv: { adapter: passthroughKVAdapter() },
		queue: { adapter: queue },
	} satisfies Partial<LucidConfig>;
	const defaults = {
		media: {
			storage: {
				...storage,
				lifecycle,
				completeUploadSession: unusedStorageOperation,
			},
			delivery: { ...passthroughMediaDeliveryAdapter(), lifecycle },
			limits: { storageBytes: 100, uploadBytes: 10 },
		},
		email: {
			adapter: { ...passthroughEmailAdapterInstance, lifecycle },
			from: { name: "Default name" },
		},
		kv: { adapter: { ...passthroughKVAdapter(), lifecycle } },
		queue: { adapter: { ...queue, lifecycle } },
	} satisfies Partial<LucidConfig>;
	const merged = mergeConfig(project, defaults);
	const selected = [
		merged.media?.storage,
		merged.media?.delivery,
		merged.email?.adapter,
		merged.kv?.adapter,
		merged.queue?.adapter,
	];
	const authored = [
		project.media.storage,
		project.media.delivery,
		project.email.adapter,
		project.kv.adapter,
		project.queue.adapter,
	];
	for (const [index, adapter] of selected.entries()) {
		expect(adapter).toBe(authored[index]);
		expect(adapter).not.toHaveProperty("lifecycle");
	}
	expect(merged.media?.storage).not.toHaveProperty("completeUploadSession");
	expect(merged.media?.limits).toEqual({ storageBytes: 100, uploadBytes: 20 });
	expect(merged.email?.from).toEqual({
		name: "Default name",
		email: "project@example.com",
	});
	expect(defaults.media.storage.lifecycle).toBe(lifecycle);
	expect(mergeConfig({}, defaults).media?.storage).toBe(defaults.media.storage);
});

test("keeps opaque provider state without traversing its object graph", () => {
	const adapter = {
		...passthroughEmailAdapterInstance,
		state: new Map<string, unknown>(),
	};
	adapter.state.set("self", adapter);
	const merged = mergeConfig({ email: { adapter } }, {});
	expect(merged.email?.adapter).toBe(adapter);
	expect(adapter.state.get("self")).toBe(adapter);
});

test("does not initialize a plugin default lifecycle for an explicit project email adapter", async () => {
	const init = vi.fn(async () => {});
	const projectAdapter = { ...passthroughEmailAdapterInstance, key: "project" };
	const processed = await processConfig(
		{
			secrets: "a".repeat(64),
			email: { adapter: projectAdapter },
			plugins: [
				{
					key: "email-default",
					lucid: "*",
					defaults: {
						email: {
							adapter: {
								...passthroughEmailAdapterInstance,
								key: "plugin",
								lifecycle: { init },
							},
						},
					},
				},
			],
		},
		{
			resolvedDb: {
				adapter: "test",
				connect: vi.fn(),
			} as unknown as DatabaseAdapter,
			skipValidation: true,
		},
	);
	expect(processed.email.adapter).toBe(projectAdapter);
	const initialized = await getInitializedEmailAdapter(processed);
	expect(initialized).toBe(projectAdapter);
	expect(init).not.toHaveBeenCalled();
});
