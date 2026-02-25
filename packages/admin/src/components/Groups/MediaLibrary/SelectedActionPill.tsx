import classNames from "classnames";
import { type Component, createMemo, Show } from "solid-js";
import Button from "@/components/Partials/Button";
import T from "@/translations";

export const SelectedActionPill: Component<{
	state: {
		selectedFolders: Array<number>;
		selectedMedia: Array<number>;
	};
	actions: {
		addSelectedFolder: (folder: number) => void;
		addSelectedMedia: (media: number) => void;
		resetSelectedFolders: () => void;
		resetSelectedMedia: () => void;
		deleteAction?: () => void;
		restoreAction?: () => void;
		deletePermanentlyAction?: () => void;
	};
	options?: {
		showingDeleted?: boolean;
		allowDelete?: boolean;
		allowRestore?: boolean;
		allowDeletePermanently?: boolean;
	};
}> = (props) => {
	// ----------------------------------------
	// Memons
	const hasSelected = createMemo(() => {
		return (
			props.state.selectedFolders.length > 0 ||
			props.state.selectedMedia.length > 0
		);
	});
	const showDeleteAction = createMemo(() => {
		if (!props.options?.allowDelete) return false;
		return !!props.actions.deleteAction;
	});
	const showRestoreAction = createMemo(() => {
		if (!props.options?.allowRestore) return false;
		return !!props.actions.restoreAction;
	});
	const showDeletePermanentlyAction = createMemo(() => {
		if (!props.options?.allowDeletePermanently) return false;
		return !!props.actions.deletePermanentlyAction;
	});
	const isWidePill = createMemo(() => {
		let count = 1; // reset
		if (showRestoreAction()) count++;
		if (showDeleteAction()) count++;
		if (showDeletePermanentlyAction()) count++;
		return count > 2;
	});

	// ----------------------------------------
	// Render
	return (
		<Show when={hasSelected()}>
			<div class="fixed bottom-4 md:bottom-6 left-[220px] right-0 flex justify-center items-center z-40 pointer-events-none px-4">
				<div
					class={classNames(
						"pointer-events-auto bg-card-base p-2 border border-border rounded-md w-full justify-between flex items-center",
						isWidePill() ? "max-w-[460px]" : "max-w-[400px]",
					)}
				>
					<p class="text-sm">
						<span class="font-bold">
							{hasSelected()
								? props.options?.showingDeleted
									? `${props.state.selectedMedia.length} ${T()("media")}`
									: `${props.state.selectedFolders.length} ${T()("folders")}, ${props.state.selectedMedia.length} ${T()("media")}`
								: T()("nothing_selected")}
						</span>{" "}
						{T()("selected")}
					</p>
					<div class="ml-2 flex gap-2">
						<Button
							theme="border-outline"
							size="small"
							onClick={() => {
								props.actions.resetSelectedFolders();
								props.actions.resetSelectedMedia();
							}}
						>
							{T()("reset")}
						</Button>
						<Show when={showRestoreAction()}>
							<Button
								theme="primary"
								size="small"
								onClick={() => {
									props.actions.restoreAction?.();
								}}
							>
								{T()("restore")}
							</Button>
						</Show>
						<Show when={showDeleteAction()}>
							<Button
								theme="danger"
								size="small"
								onClick={() => {
									props.actions.deleteAction?.();
								}}
							>
								{T()("delete")}
							</Button>
						</Show>
						<Show when={showDeletePermanentlyAction()}>
							<Button
								theme="danger"
								size="small"
								onClick={() => {
									props.actions.deletePermanentlyAction?.();
								}}
							>
								{T()("delete")}
							</Button>
						</Show>
					</div>
				</div>
			</div>
		</Show>
	);
};
