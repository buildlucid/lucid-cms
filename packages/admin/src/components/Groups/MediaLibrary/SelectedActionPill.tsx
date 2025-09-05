import T from "@/translations";
import { type Accessor, createMemo, Show, type Component } from "solid-js";
import Button from "@/components/Partials/Button";

export const SelectedActionPill: Component<{
	state: {
		setSelectedFolders: Accessor<Array<number>>;
		setSelectedMedia: Accessor<Array<number>>;
	};
}> = (props) => {
	// ----------------------------------------
	// Memons
	const hasSelected = createMemo(() => {
		return (
			props.state.setSelectedFolders().length > 0 ||
			props.state.setSelectedMedia().length > 0
		);
	});

	// ----------------------------------------
	// Render
	return (
		<Show when={hasSelected()}>
			<div class="fixed bottom-4 md:bottom-6 left-[220px] right-0 flex justify-center items-center z-40 pointer-events-none px-4">
				<div class="pointer-events-auto bg-card-base p-2 border border-border rounded-md max-w-[400px] w-full justify-between flex items-center">
					<p class="text-sm">
						<span class="font-bold">
							{hasSelected()
								? `${props.state.setSelectedFolders().length} ${T()("folders")}, ${props.state.setSelectedMedia().length} ${T()("media")}`
								: T()("nothing_selected")}
						</span>{" "}
						{T()("selected")}
					</p>
					<div class="ml-2 flex gap-2">
						<Button theme="border-outline" size="small" onClick={() => {}}>
							{T()("reset")}
						</Button>
						<Button theme="danger" size="small" onClick={() => {}}>
							{T()("delete")}
						</Button>
					</div>
				</div>
			</div>
		</Show>
	);
};
