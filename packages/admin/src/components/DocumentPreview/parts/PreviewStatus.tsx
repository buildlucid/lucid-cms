import type { PreviewMode } from "@types";
import { type Component, createMemo } from "solid-js";
import StatusIndicator from "@/components/StatusIndicator/StatusIndicator";
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
			class="inline-flex h-7 shrink-0 items-center gap-1.5 px-1 text-xs font-medium whitespace-nowrap text-muted"
		>
			<StatusIndicator
				variant={props.mode === "scoped" ? "warning" : "primary"}
				size="xs"
			/>
			{status().label}
		</span>
	);
};
