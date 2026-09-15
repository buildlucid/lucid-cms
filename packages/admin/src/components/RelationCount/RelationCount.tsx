import classNames from "classnames";
import { type Component, createMemo } from "solid-js";

const INFINITY_SYMBOL = "\u221e";

const RelationCount: Component<{
	count: number;
	min?: number;
	max?: number;
	class?: string;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const min = createMemo<number | null>(() =>
		typeof props.min === "number" ? props.min : null,
	);
	const max = createMemo<number | null>(() =>
		typeof props.max === "number" ? props.max : null,
	);
	const hasMin = createMemo(() => min() !== null);
	const hasMax = createMemo(() => max() !== null);
	const isInvalidMin = createMemo(() => {
		const minValue = min();
		return minValue !== null && props.count < minValue;
	});
	const isAtMax = createMemo(() => {
		const maxValue = max();
		return maxValue !== null && props.count >= maxValue;
	});

	// ----------------------------------------
	// Render

	if (!hasMin() && !hasMax()) {
		return <span class={props.class}>{props.count}</span>;
	}

	return (
		<span
			class={classNames(props.class, {
				"text-error-base": isInvalidMin() || isAtMax(),
			})}
		>
			{props.count}/{max() ?? INFINITY_SYMBOL}
		</span>
	);
};

export default RelationCount;
