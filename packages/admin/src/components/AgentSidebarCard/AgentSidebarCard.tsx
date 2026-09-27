import classnames from "classnames";
import { FaSolidXmark } from "solid-icons/fa";
import { createUniqueId, type JSX, type ParentComponent } from "solid-js";
import T from "@/translations";

const AgentSidebarCard: ParentComponent<{
	title: JSX.Element;
	onClose: () => void;
	class?: string;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const id = createUniqueId();

	// ----------------------------------------
	// Render
	return (
		<aside
			aria-labelledby={id}
			class={classnames(
				"flex flex-col gap-5 rounded-xl border border-border bg-card p-4 shadow-lg animate-slide-from-right-in md:p-5",
				props.class,
			)}
		>
			<div class="flex items-start justify-between gap-2">
				<h3 id={id} class="wrap-break-words text-sm font-medium text-title">
					{props.title}
				</h3>
				<button
					type="button"
					class="-mt-0.5 -mr-1 flex size-6 shrink-0 items-center justify-center rounded-md text-icon transition-colors hover:text-icon-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
					aria-label={T()("common.close")}
					title={T()("common.close")}
					onClick={() => props.onClose()}
				>
					<FaSolidXmark size={12} />
				</button>
			</div>
			{props.children}
		</aside>
	);
};

export default AgentSidebarCard;
