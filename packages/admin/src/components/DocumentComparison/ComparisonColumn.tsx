import classNames from "classnames";
import {
	createSignal,
	onCleanup,
	onMount,
	type ParentComponent,
} from "solid-js";

/**
 * One side-by-side column. While comparing on wide screens it sticks below
 * the page builder header and comparison bar, so the shorter column stays in
 * view. A column taller than the screen scrolls until its end is visible,
 * then sticks there.
 */
const ComparisonColumn: ParentComponent<{
	sticky: boolean;
	class?: string;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	let ref: HTMLDivElement | undefined;
	const [height, setHeight] = createSignal(0);

	// ----------------------------------------
	// Effects
	onMount(() => {
		if (!ref) return;

		const observer = new ResizeObserver(() => {
			if (ref) setHeight(ref.offsetHeight);
		});
		observer.observe(ref);
		onCleanup(() => observer.disconnect());
	});

	// ----------------------------------------
	// Render
	return (
		<div
			ref={ref}
			class={classNames(props.class, {
				"xl:sticky xl:self-start": props.sticky,
			})}
			style={
				props.sticky
					? {
							top: `min(calc(var(--document-header-bar-height, 0px) + var(--comparison-bar-height)), calc(100vh - ${height()}px))`,
						}
					: undefined
			}
		>
			{props.children}
		</div>
	);
};

export default ComparisonColumn;
