import classNames from "classnames";
import { FaSolidTriangleExclamation } from "solid-icons/fa";
import { type Component, createMemo, Show } from "solid-js";
import Pill from "@/components/Partials/Pill";
import T from "@/translations";

interface FieldErrorBadgeProps {
	count: number;
	compact?: boolean;
	class?: string;
}

export const FieldErrorBadge: Component<FieldErrorBadgeProps> = (props) => {
	// ----------------------------------------
	// Memos
	const label = createMemo(() =>
		props.count === 1 ? T()("common.error") : T()("common.errors"),
	);

	// ----------------------------------------
	// Render
	return (
		<Show when={props.count > 0}>
			<Pill
				theme="error-opaque"
				size="small"
				class={classNames("shrink-0 gap-1", props.class)}
				role="img"
				aria-label={`${props.count} ${label()}`}
				tooltip={`${props.count} ${label()}`}
			>
				<FaSolidTriangleExclamation size={8} aria-hidden="true" />
				<span aria-hidden="true">
					{props.compact
						? props.count
						: `${props.count} ${label().toLowerCase()}`}
				</span>
			</Pill>
		</Show>
	);
};
