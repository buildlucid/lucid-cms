import { type Accessor, createSignal, onCleanup } from "solid-js";

/** Window scroll progress over `distance` pixels, clamped to 0–1 and updated once per frame. */
export const useScrollProgress = (distance: number): Accessor<number> => {
	const read = () => Math.min(1, Math.max(0, window.scrollY / distance));
	const [progress, setProgress] = createSignal(read());
	let frame: number | undefined;

	const onScroll = () => {
		if (frame !== undefined) return;
		frame = requestAnimationFrame(() => {
			frame = undefined;
			setProgress(read());
		});
	};
	window.addEventListener("scroll", onScroll, { passive: true });
	onCleanup(() => {
		if (frame !== undefined) cancelAnimationFrame(frame);
		window.removeEventListener("scroll", onScroll);
	});

	return progress;
};
