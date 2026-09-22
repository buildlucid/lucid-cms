import { type Component, For, Show } from "solid-js";
import T from "@/translations";

/** Shows saved grants that can no longer be selected. */
const UnavailableGrants: Component<{
	keys: string[];
	onRemove: (key: string) => void;
	disabled?: boolean;
}> = (props) => {
	// -----------------------------------
	// Render
	return (
		<Show when={props.keys.length > 0}>
			<div class="mb-3 p-3 rounded-md border border-border bg-card">
				<h4 class="text-sm font-medium text-body">
					{T()("access.unavailable.title")}
				</h4>
				<p class="text-xs text-muted mt-1">
					{T()("access.unavailable.description")}
				</p>
				<ul class="mt-2 space-y-2">
					<For each={props.keys}>
						{(key) => (
							<li class="flex items-center justify-between gap-3 text-sm text-body">
								<span>{key}</span>
								<button
									type="button"
									class="text-xs text-muted hover:text-body disabled:opacity-50"
									disabled={props.disabled}
									onClick={() => props.onRemove(key)}
								>
									{T()("common.remove")}
								</button>
							</li>
						)}
					</For>
				</ul>
			</div>
		</Show>
	);
};

export default UnavailableGrants;
