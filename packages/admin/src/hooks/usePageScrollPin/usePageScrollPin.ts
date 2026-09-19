import { createEffect, onCleanup } from "solid-js";

const RESTORE_TIMEOUT_MS = 2000;

/**
 * Pins the page behind an open dialog to where the user left it.
 */
export const usePageScrollPin = (active: () => boolean) => {
	createEffect(() => {
		if (!active()) return;

		const left = window.scrollX;
		const top = window.scrollY;
		if (left === 0 && top === 0) return;

		let frame: number | undefined;
		let deadline = 0;

		const attempt = () => {
			frame = undefined;
			if (window.scrollX === left && window.scrollY === top) return;

			window.scrollTo(left, top);

			//* a restore against a collapsed document is clamped back, so keep
			//* trying until the content the page behind lost has rendered again
			if (window.scrollY !== top && performance.now() < deadline) {
				frame = requestAnimationFrame(attempt);
			}
		};
		const onScroll = () => {
			if (window.scrollX === left && window.scrollY === top) return;
			deadline = performance.now() + RESTORE_TIMEOUT_MS;
			if (frame === undefined) frame = requestAnimationFrame(attempt);
		};

		window.addEventListener("scroll", onScroll, { passive: true });
		onCleanup(() => {
			window.removeEventListener("scroll", onScroll);
			if (frame !== undefined) cancelAnimationFrame(frame);
		});
	});
};

export default usePageScrollPin;
