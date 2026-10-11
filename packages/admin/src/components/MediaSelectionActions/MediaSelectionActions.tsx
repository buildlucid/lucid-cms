import { type Component, createMemo, Show } from "solid-js";
import SelectionBar, {
	type SelectionBarAction,
} from "@/components/SelectionBar/SelectionBar";
import T from "@/translations";

/** Shows available selection actions for media and folders. */
export const MediaSelectionActions: Component<{
	state: {
		selectedFolders: Array<number>;
		selectedMedia: Array<number>;
		/** Deleted media has no folders, so only media is counted. */
		showingDeleted?: boolean;
	};
	actions: {
		clear: () => void;
		restore?: () => void;
		delete?: () => void;
		deletePermanently?: () => void;
		/** Adds the selected media to the agent's chat box. */
		addToChat?: () => void;
	};
}> = (props) => {
	// ----------------------------------------
	// Memos
	const hasSelected = createMemo(
		() =>
			props.state.selectedFolders.length > 0 ||
			props.state.selectedMedia.length > 0,
	);
	const count = createMemo(() =>
		props.state.showingDeleted
			? `${props.state.selectedMedia.length} ${T()("common.media")}`
			: `${props.state.selectedFolders.length} ${T()("common.folders")}, ${props.state.selectedMedia.length} ${T()("common.media")}`,
	);
	//* the built-in actions come first, so the first one is the main button
	const actions = createMemo(() => {
		const items: SelectionBarAction[] = [];
		const {
			restore,
			delete: remove,
			deletePermanently,
			addToChat,
		} = props.actions;
		if (restore) {
			items.push({
				label: T()("common.restore"),
				icon: "restore",
				variant: "primary",
				onSelect: restore,
			});
		}
		if (remove) {
			items.push({
				label: T()("common.delete"),
				icon: "trash",
				variant: "danger",
				onSelect: remove,
			});
		}
		if (deletePermanently) {
			items.push({
				label: T()("common.delete"),
				icon: "trash",
				variant: "danger",
				onSelect: deletePermanently,
			});
		}
		if (addToChat) {
			items.push({
				label: T()("agent.attach"),
				icon: "chat",
				onSelect: addToChat,
			});
		}
		return items;
	});

	// ----------------------------------------
	// Render
	return (
		<Show when={hasSelected() && actions().length > 0}>
			<SelectionBar
				count={count()}
				actions={actions()}
				onClear={() => props.actions.clear()}
			/>
		</Show>
	);
};
