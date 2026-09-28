import { createSignal, onCleanup, onMount } from "solid-js";

const isSuperKeyEvent = (event: KeyboardEvent) =>
	event.key === "Meta" ||
	event.key === "OS" ||
	event.code === "MetaLeft" ||
	event.code === "MetaRight" ||
	event.code === "OSLeft" ||
	event.code === "OSRight";

const useSuperKeyHeld = () => {
	const [held, setHeld] = createSignal(false);

	onMount(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.metaKey || isSuperKeyEvent(event)) setHeld(true);
		};
		const handleKeyUp = (event: KeyboardEvent) => {
			if (isSuperKeyEvent(event) || !event.metaKey) setHeld(false);
		};
		const reset = () => setHeld(false);

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);
		window.addEventListener("blur", reset);
		document.addEventListener("visibilitychange", reset);

		onCleanup(() => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
			window.removeEventListener("blur", reset);
			document.removeEventListener("visibilitychange", reset);
		});
	});

	return held;
};

export default useSuperKeyHeld;
