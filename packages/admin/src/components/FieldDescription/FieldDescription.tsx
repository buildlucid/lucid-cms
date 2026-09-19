import classNames from "classnames";
import {
	type Component,
	createEffect,
	createSignal,
	createUniqueId,
	onCleanup,
	Show,
} from "solid-js";
import T from "@/translations";

interface DescribedByProps {
	id?: string;
	describedBy?: string;
	class?: string;
}

export const FieldDescription: Component<DescribedByProps> = (props) => {
	// ----------------------------------
	// State & Hooks
	const [expanded, setExpanded] = createSignal(false);
	const [expandable, setExpandable] = createSignal(false);
	const [content, setContent] = createSignal<HTMLDivElement>();
	const fallbackId = createUniqueId();
	const id = () => `${props.id ?? fallbackId}-description`;

	// ----------------------------------
	// Effects
	createEffect(() => {
		const element = content();
		props.describedBy;
		setExpanded(false);
		if (!element) return;

		// Observe the unclipped content so resizing and font changes work even
		// while the visible description is limited to two lines.
		const measure = () => {
			const lineHeight = Number.parseFloat(
				getComputedStyle(element).lineHeight,
			);
			const overflows = element.scrollHeight > lineHeight * 2 + 1;
			setExpandable(overflows);
			if (!overflows) setExpanded(false);
		};
		const observer = new ResizeObserver(measure);
		observer.observe(element);
		measure();
		onCleanup(() => observer.disconnect());
	});

	// ----------------------------------
	// Render
	return (
		<Show when={props?.describedBy}>
			<div
				class={classNames("text-sm leading-5 mt-2 text-unfocused", props.class)}
			>
				<div
					id={id()}
					class="overflow-hidden"
					classList={{ "max-h-[2lh]": !expanded() }}
				>
					<div ref={setContent}>{props.describedBy}</div>
				</div>
				<Show when={expandable()}>
					<button
						type="button"
						class="mt-1 rounded-sm text-sm text-subtitle underline decoration-unfocused/50 underline-offset-4 hover:text-primary-base"
						aria-expanded={expanded()}
						aria-controls={id()}
						onClick={() => setExpanded((value) => !value)}
					>
						{T()(expanded() ? "common.show_less" : "common.show_more")}
					</button>
				</Show>
			</div>
		</Show>
	);
};
