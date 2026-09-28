/** Resolves once an element matching the selector is in the document, or when the timeout passes. */
const rendered = (selector: string, timeout: number) =>
	new Promise<void>((resolve) => {
		if (document.querySelector(selector)) {
			resolve();
			return;
		}
		const done = () => {
			observer.disconnect();
			clearTimeout(timer);
			resolve();
		};
		//* rendering is paused during the update, so animation frames never run to poll with
		const observer = new MutationObserver(() => {
			if (document.querySelector(selector)) done();
		});
		const timer = setTimeout(done, timeout);
		observer.observe(document.body, { childList: true, subtree: true });
	});

/**
 * Runs an update, such as a navigation, inside a view transition, so elements
 * sharing a `view-transition-name` animate from their old place to their new
 * one. The browser holds the old page on screen until the update settles, so
 * this only waits until an element matching `ready` renders, or `timeout`
 * passes, never on the new page's data. Without support, or when the reader
 * prefers reduced motion, it just runs the update.
 *
 * @example
 * ```ts
 * startViewTransition(() => navigate(`/lucid/agent/chats/${id}`), {
 * 	ready: "[data-agent-chat] .agent-composer-morph",
 * });
 * ```
 */
export const startViewTransition = (
	update: () => void,
	options: { ready: string; timeout?: number },
) => {
	if (
		!("startViewTransition" in document) ||
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	) {
		update();
		return;
	}
	document.startViewTransition(() => {
		update();
		return rendered(options.ready, options.timeout ?? 300);
	});
};
