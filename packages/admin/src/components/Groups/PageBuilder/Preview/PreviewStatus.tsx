import type { PreviewMode } from "@types";
import { type Component, createMemo } from "solid-js";
import T from "@/translations";

export const PreviewStatus: Component<{ mode: PreviewMode }> = (props) => {
	// ----------------------------
	// Memos
	const status = createMemo(() =>
		props.mode === "scoped"
			? {
					label: T()("preview.mode.scoped.status"),
					description: T()("preview.mode.scoped.description"),
				}
			: {
					label: T()("preview.mode.perspective.status"),
					description: T()("preview.mode.perspective.description"),
				},
	);

	// ----------------------------
	// Render
	return (
		<span
			role="status"
			data-preview-mode={props.mode}
			aria-label={status().description}
			title={status().description}
			class="inline-flex h-7 shrink-0 items-center gap-1.5 px-1 text-xs font-medium whitespace-nowrap text-unfocused"
		>
			<span
				aria-hidden="true"
				classList={{
					"h-1.5 w-1.5 rounded-full": true,
					"bg-warning-base": props.mode === "scoped",
					"bg-primary-base": props.mode === "perspective",
				}}
			/>
			{status().label}
		</span>
	);
};
