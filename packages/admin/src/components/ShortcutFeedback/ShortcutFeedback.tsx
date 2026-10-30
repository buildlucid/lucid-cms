import classNames from "classnames";
import { type Component, createSignal } from "solid-js";

const VISIBLE_MS = 1400;

const [message, setMessage] = createSignal<string>();
const [visible, setVisible] = createSignal(false);
let hideTimer: ReturnType<typeof setTimeout> | undefined;

/** Briefly shows what a shortcut did, replacing whatever it showed last. */
export const showShortcutFeedback = (text: string) => {
	setMessage(text);
	setVisible(true);
	clearTimeout(hideTimer);
	hideTimer = setTimeout(() => setVisible(false), VISIBLE_MS);
};

/** The bottom-centre pill `showShortcutFeedback` fills, mounted once in the navigation shell. */
const ShortcutFeedback: Component = () => {
	// ----------------------------------------
	// Render
	return (
		<div
			role="status"
			class="pointer-events-none fixed inset-x-0 bottom-6 z-1000 flex justify-center px-4"
		>
			<span
				class={classNames(
					"rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-title shadow-md transition-[opacity,translate] duration-200 motion-reduce:transition-opacity",
					visible()
						? "translate-y-0 opacity-100"
						: "translate-y-2 opacity-0 motion-reduce:translate-y-0",
				)}
				//* cleared once hidden, so screen readers don't find a stale message
				onTransitionEnd={() => {
					if (!visible()) setMessage(undefined);
				}}
			>
				{message()}
			</span>
		</div>
	);
};

export default ShortcutFeedback;
