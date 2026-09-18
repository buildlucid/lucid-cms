import { createRoot } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import brickStore from "@/store/brickStore/brickStore";
import { useDocumentAutoSave } from "./useDocumentAutoSave";

type AutoSaveProps = Parameters<typeof useDocumentAutoSave>[0];

describe("draft validation after reverting edits", () => {
	let dispose = () => {};
	beforeEach(() => {
		vi.useFakeTimers();
		brickStore.get.reset();
		brickStore.set("bricks", [
			{
				key: "seo",
				ref: "seo",
				type: "fixed",
				open: true,
				order: 0,
				fields: [{ key: "metadata", type: "repeater", groups: [] }],
			},
		]);
		brickStore.get.captureInitialSnapshot();
		brickStore.set("skipAutoSave", false);
	});
	afterEach(() => {
		dispose();
		brickStore.get.reset();
		vi.useRealTimers();
	});

	it.each([
		true,
		false,
	])("rechecks a removed invalid group with autosave %s", async (autoSaveActive) => {
		const check = vi
			.fn<
				AutoSaveProps["checkSingleVersionMutation"]["action"]["mutateAsync"]
			>()
			.mockRejectedValueOnce(new Error("Invalid repeater group"))
			.mockResolvedValue({
				data: { fields: [], bricks: [] },
				meta: {
					links: [],
					path: "",
					currentPage: null,
					lastPage: null,
					perPage: null,
					total: null,
				},
			});
		const save =
			vi.fn<AutoSaveProps["updateSingleVersionMutation"]["action"]["mutate"]>();
		createRoot((cleanup) => {
			dispose = cleanup;
			useDocumentAutoSave({
				checkSingleVersionMutation: {
					action: { isPending: false, mutateAsync: check },
				},
				updateSingleVersionMutation: {
					action: { isPending: false, mutate: save },
				},
				collection: () => ({ key: "page" }),
				document: () => ({ id: 1, versionId: 1 }),
				hasDraftSyncPermission: () => true,
				autoSaveActive: () => autoSaveActive,
			});
		});
		await vi.advanceTimersByTimeAsync(1000);
		expect(check).not.toHaveBeenCalled();

		brickStore.get.addRepeaterGroup({
			brickIndex: 0,
			key: "metadata",
			fieldConfig: [],
			locales: [],
		});
		await vi.advanceTimersByTimeAsync(1000);
		expect(check).toHaveBeenCalledTimes(1);
		expect(save).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1000);
		expect(check).toHaveBeenCalledTimes(1);

		const group = brickStore.get.bricks[0]?.fields[0]?.groups?.[0];
		if (!group) throw new Error("Expected the new repeater group");
		brickStore.get.removeRepeaterGroup({
			brickIndex: 0,
			repeaterKey: "metadata",
			targetRef: group.ref,
		});
		expect(brickStore.getDocumentMutated()).toBe(false);
		await vi.advanceTimersByTimeAsync(1000);
		expect(check).toHaveBeenCalledTimes(2);
		expect(
			check.mock.lastCall?.[0].body.bricks?.[0]?.fields[0]?.groups,
		).toEqual([]);
		expect(save).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1000);
		expect(check).toHaveBeenCalledTimes(2);
	});
});
