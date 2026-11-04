import type { PreviewUpdateHandler } from "@lucidcms/types";

/**
 * Runs revisions sequentially. New revisions abort the active one but wait for all handlers to
 * settle, preserving order even if cancellation is ignored. Reloads if handlers disappear or fail.
 */
export const createPreviewUpdates = (
	targetWindow: Window,
	handlers: () => PreviewUpdateHandler[],
	/** Runs once the handlers have shown a revision. */
	onRendered: (revision: number) => void,
) => {
	let running: AbortController | null = null;
	let queued: number | null = null;

	const run = async (revision: number) => {
		//* the last handler may have gone while an earlier revision ran
		const current = handlers();
		if (current.length === 0) {
			targetWindow.location.reload();
			return;
		}

		const controller = new AbortController();
		running = controller;
		const results = await Promise.allSettled(
			current.map(async (handler) =>
				handler({ revision, signal: controller.signal }),
			),
		);
		running = null;
		if (!controller.signal.aborted) {
			if (results.some((result) => result.status === "rejected")) {
				targetWindow.location.reload();
				return;
			}
			onRendered(revision);
		}

		if (queued !== null) {
			const next = queued;
			queued = null;
			void run(next);
		}
	};

	return {
		/** Shows a new revision of the content. */
		receive: (revision: number) => {
			if (handlers().length === 0) {
				targetWindow.location.reload();
				return;
			}
			if (running) {
				running.abort();
				queued = revision;
				return;
			}
			void run(revision);
		},
		/** Aborts the running update and drops any queued one. */
		cancel: () => {
			queued = null;
			running?.abort();
		},
	};
};
