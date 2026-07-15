import { type Component, createMemo } from "solid-js";
import T from "@/translations";

export const PreviewStatus: Component<{ kind: "exact" | "session" }> = (
	props,
) => {
	// ----------------------------
	// Memos
	const status = createMemo(() =>
		props.kind === "exact"
			? {
					label: T()("preview.mode.exact.status"),
					description: T()("preview.mode.exact.description"),
				}
			: {
					label: T()("preview.mode.session.status"),
					description: T()("preview.mode.session.description"),
				},
	);

	// ----------------------------
	// Render
	return (
		<span
			role="status"
			data-preview-kind={props.kind}
			aria-label={status().description}
			title={status().description}
			class="inline-flex h-7 shrink-0 items-center gap-1.5 px-1 text-xs font-medium whitespace-nowrap text-unfocused"
		>
			<span
				aria-hidden="true"
				classList={{
					"h-1.5 w-1.5 rounded-full": true,
					"bg-warning-base": props.kind === "exact",
					"bg-primary-base": props.kind === "session",
				}}
			/>
			{status().label}
		</span>
	);
};
