import { createSignal, onCleanup, onMount } from "solid-js";

/**
 * Whether a component has painted once. Gate size transitions on it, so a
 * change animates while one settled as the component opens does not.
 *
 * @example
 * ```tsx
 * const painted = useFirstPaint();
 *
 * return <div classList={{ "transition-[height]": painted() }} />;
 * ```
 */
export const useFirstPaint = () => {
	// ----------------------------------------
	// State & Hooks
	const [painted, setPainted] = createSignal(false);

	// ----------------------------------------
	// Effects
	onMount(() => {
		//* the first frame lays out the opening state, the second follows its paint
		let frame = requestAnimationFrame(() => {
			frame = requestAnimationFrame(() => setPainted(true));
		});
		onCleanup(() => cancelAnimationFrame(frame));
	});

	return painted;
};

export default useFirstPaint;
