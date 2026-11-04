import type { PreviewUpdate, PreviewUpdateHandler } from "@lucidcms/types";
import { describe, expect, test, vi } from "vitest";
import { createPreviewUpdates } from "./updates.js";

const createWindow = () => {
	const reload = vi.fn();
	return {
		reload,
		targetWindow: { location: { reload } } as unknown as Window,
	};
};

describe("preview updates", () => {
	test("reloads when no handler is registered or a handler fails", async () => {
		const { reload, targetWindow } = createWindow();
		const handlers = new Set<PreviewUpdateHandler>();
		const updates = createPreviewUpdates(
			targetWindow,
			() => [...handlers],
			() => undefined,
		);

		updates.receive(1);
		expect(reload).toHaveBeenCalledTimes(1);

		handlers.add(() => {
			throw new Error("render failed");
		});
		updates.receive(2);
		await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(2));
	});

	test("aborts a running update and runs only the newest revision once it settles", async () => {
		const { reload, targetWindow } = createWindow();
		const seen: PreviewUpdate[] = [];
		let finishFirst = () => {};
		const handler: PreviewUpdateHandler = (update) => {
			seen.push(update);
			if (update.revision !== 1) return;
			return new Promise<void>((resolve) => {
				finishFirst = resolve;
			});
		};
		const rendered = vi.fn();
		const updates = createPreviewUpdates(
			targetWindow,
			() => [handler],
			rendered,
		);

		updates.receive(1);
		updates.receive(2);
		updates.receive(3);
		expect(seen.map((update) => update.revision)).toEqual([1]);
		expect(seen[0]?.signal.aborted).toBe(true);

		finishFirst();
		await vi.waitFor(() =>
			expect(seen.map((update) => update.revision)).toEqual([1, 3]),
		);
		expect(seen[1]?.signal.aborted).toBe(false);
		expect(reload).not.toHaveBeenCalled();
		//* only the revision that finished is shown
		expect(rendered.mock.calls).toEqual([[3]]);
	});

	test("waits for every handler to settle before running the queued revision", async () => {
		const { targetWindow } = createWindow();
		const commits: number[] = [];
		let finishSlow = () => {};
		//* gives up as soon as it's aborted
		const quick: PreviewUpdateHandler = ({ signal }) =>
			new Promise<void>((_resolve, reject) => {
				signal.addEventListener("abort", () => reject(signal.reason));
			});
		//* ignores its signal and commits whenever it finishes
		const slow: PreviewUpdateHandler = ({ revision }) => {
			if (revision !== 1) {
				commits.push(revision);
				return;
			}
			return new Promise<void>((resolve) => {
				finishSlow = () => {
					commits.push(revision);
					resolve();
				};
			});
		};
		const updates = createPreviewUpdates(
			targetWindow,
			() => [quick, slow],
			() => undefined,
		);

		updates.receive(1);
		updates.receive(2);
		await Promise.resolve();
		expect(commits).toEqual([]);

		finishSlow();
		await vi.waitFor(() => expect(commits).toEqual([1, 2]));
	});

	test("reloads for a queued revision when the last handler went while an earlier one ran", async () => {
		const { reload, targetWindow } = createWindow();
		let finishFirst = () => {};
		const handler: PreviewUpdateHandler = () =>
			new Promise<void>((resolve) => {
				finishFirst = resolve;
			});
		const handlers = new Set([handler]);
		const updates = createPreviewUpdates(
			targetWindow,
			() => [...handlers],
			() => undefined,
		);

		updates.receive(1);
		updates.receive(2);
		handlers.delete(handler);
		finishFirst();

		await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
	});
});
