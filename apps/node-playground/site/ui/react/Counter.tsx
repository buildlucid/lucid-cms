import { type ReactNode, useId, useState } from "react";
import "./counter.css";

/** A counter that disables decrement at zero, with Kiln `children` and `footer` slots. */
export default function Counter(props: {
	start?: number;
	children?: ReactNode;
	footer?: ReactNode;
}) {
	const start = props.start ?? 0;
	const [count, setCount] = useState(start);
	const id = useId();
	return (
		<div className="counter">
			<div className="counter__controls">
				<button
					type="button"
					aria-label="Remove one"
					disabled={count === 0}
					onClick={() => setCount((value) => value - 1)}
				>
					−
				</button>
				<output id={id} aria-label="Count">
					{count}
				</output>
				<button
					type="button"
					aria-label="Add one"
					onClick={() => setCount((value) => value + 1)}
				>
					+
				</button>
				<button
					type="button"
					className="button--quiet"
					disabled={count === start}
					onClick={() => setCount(start)}
				>
					Reset
				</button>
			</div>
			{props.children}
			{props.footer}
		</div>
	);
}
