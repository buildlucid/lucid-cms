import { Tooltip } from "@kobalte/core";
import type { PreviewMode } from "@types";
import { FaSolidCircleInfo } from "solid-icons/fa";
import { type Component, Show } from "solid-js";
import T from "@/translations";

export const PreviewHelp: Component<{ mode: PreviewMode }> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Tooltip.Root placement="bottom-end" openDelay={400}>
			<Tooltip.Trigger
				as="button"
				type="button"
				aria-label={T()("preview.help.label")}
				class="flex h-7 w-7 min-w-7 cursor-help items-center justify-center rounded-md fill-icon-fade text-icon-fade transition-colors hover:bg-background-base/50 hover:fill-subtitle hover:text-subtitle focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-base"
			>
				<FaSolidCircleInfo size={12} />
			</Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Content class="z-50 w-80 max-w-[calc(100vw-1rem)] rounded-lg border border-border bg-card-base p-3 text-left shadow-lg">
					<Tooltip.Arrow class="text-card-base" size={16} />
					<div class="space-y-2.5 text-sm leading-relaxed text-body">
						<p class="text-sm">{T()("preview.help.fields")}</p>
						<Show when={props.mode === "scoped"}>
							<p class="text-sm">{T()("preview.help.scoped.links")}</p>
						</Show>
					</div>
				</Tooltip.Content>
			</Tooltip.Portal>
		</Tooltip.Root>
	);
};
