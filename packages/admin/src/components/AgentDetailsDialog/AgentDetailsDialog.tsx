import { Dialog } from "@kobalte/core";
import { type Component, createMemo, Show } from "solid-js";
import AgentToolPanel from "@/components/AgentToolPanel/AgentToolPanel";
import type { AgentChatView } from "@/hooks/useAgentChatView/useAgentChatView";
import { LayerContext, useLayer } from "@/hooks/useLayer/useLayer";
import { usePageScrollPin } from "@/hooks/usePageScrollPin/usePageScrollPin";
import T from "@/translations";

/**
 * Opens a chat's selected tool call, or a transcript row's panel, over the
 * chat when it is too narrow for a sidebar. Rows portal their panels in
 * through `ref`; closing deselects them.
 */
const AgentDetailsDialog: Component<{
	view: AgentChatView;
	conversationId?: string;
	ref: (element: HTMLElement) => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const parentLayer = useLayer();

	// ----------------------------------------
	// Memos
	const open = createMemo(() => props.view.selectedId() !== undefined);
	const layer = createMemo(() => (parentLayer ? parentLayer() + 20 : 50));

	// ----------------------------------------
	// Effects
	usePageScrollPin(open);

	// ----------------------------------------
	// Render
	return (
		<Dialog.Root
			open={open()}
			onOpenChange={(next) => {
				if (!next) props.view.setSelectedId(undefined);
			}}
		>
			<Dialog.Portal>
				<Dialog.Overlay
					class="fixed inset-0 cursor-pointer bg-overlay animate-overlay-hide duration-200 transition-colors data-expanded:animate-overlay-show"
					style={{ "z-index": layer() - 10 }}
				/>
				<div class="fixed inset-0" style={{ "z-index": layer() }}>
					<Dialog.Content
						data-agent-details
						aria-label={T()("agent.details.label")}
						class="pointer-events-none! flex h-full overflow-y-auto p-4 outline-hidden animate-modal-hide data-expanded:animate-modal-show"
					>
						<LayerContext.Provider value={layer}>
							<div
								ref={props.ref}
								class="pointer-events-auto m-auto flex w-full max-w-xl flex-col gap-4"
							>
								<Show when={props.conversationId} keyed>
									{(id) => (
										<Show when={props.view.selectedTool()}>
											{(tool) => (
												<AgentToolPanel
													conversationId={id}
													messageId={tool().messageId}
													part={tool().part}
													retried={props.view
														.retriedTools()
														.has(tool().part.id)}
													onClose={() => props.view.setSelectedId(undefined)}
												/>
											)}
										</Show>
									)}
								</Show>
							</div>
						</LayerContext.Provider>
					</Dialog.Content>
				</div>
			</Dialog.Portal>
		</Dialog.Root>
	);
};

export default AgentDetailsDialog;
