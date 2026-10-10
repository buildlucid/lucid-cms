import { type Accessor, createSignal, onCleanup } from "solid-js";

/** Whether a media query matches, updating as the viewport changes. */
export const useMediaQuery = (query: string): Accessor<boolean> => {
	const media = window.matchMedia(query);
	const [matches, setMatches] = createSignal(media.matches);
	const update = () => setMatches(media.matches);

	media.addEventListener("change", update);
	onCleanup(() => media.removeEventListener("change", update));

	return matches;
};
