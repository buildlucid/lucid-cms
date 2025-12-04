import { A } from "@solidjs/router";
import type { MediaFolderResponse } from "@types";
import { FaSolidFolder } from "solid-icons/fa";
import { type Accessor, createMemo, Show, type Component } from "solid-js";
import userStore from "@/store/userStore";
import mediaStore from "@/store/mediaStore";
import { useLocation, useNavigate } from "@solidjs/router";
import { Checkbox } from "@/components/Groups/Form";
import { createDraggable, createDroppable } from "@thisbeyond/solid-dnd";
import classNames from "classnames";
import T from "@/translations";
import ActionDropdown from "@/components/Partials/ActionDropdown";
import type useRowTarget from "@/hooks/useRowTarget";

export const MediaFolderCardLoading: Component = () => {
	// ----------------------------------
	// Return
	return (
		<li class={"bg-background-base border-border border rounded-md"}>
			<div class="p-4">
				<span class="skeleton block h-5 w-1/2 mb-2" />
				<span class="skeleton block h-5 w-full" />
			</div>
		</li>
	);
};

export const MediaFolderCard: Component<{
	folder: MediaFolderResponse;
	isDragging: Accessor<boolean>;
	rowTarget: ReturnType<typeof useRowTarget<"updateFolder">>;
}> = (props) => {
	// ----------------------------------
	// Hooks
	const draggable = createDraggable(`folder:${props.folder.id}`);
	const droppable = createDroppable(`folder:${props.folder.id}`);

	// ----------------------------------
	// State & Hooks
	const location = useLocation();
	const navigate = useNavigate();

	// ----------------------------------
	// Memos
	const hasUpdatePermission = createMemo(() => {
		return userStore.get.hasPermission(["update_media"]).all;
	});
	const isSelected = createMemo(() => {
		return mediaStore.get.selectedFolders.includes(props.folder.id);
	});
	const getPath = createMemo(() => {
		return `/admin/media/${props.folder.id}?${location.search}`;
	});

	// ----------------------------------
	// Handlers
	const navigateToFolder = () => {
		if (props.isDragging()) return;
		navigate(getPath(), {
			scroll: false,
		});
	};

	// ----------------------------------
	// Render
	return (
		<li
			// @ts-expect-error
			use:droppable
			use:draggable
			class={classNames(
				"group flex items-start gap-3 rounded-md cursor-pointer border border-border p-3 bg-card-base hover:bg-card-hover relative",
				{
					"bg-card-hover": droppable.isActiveDroppable,
				},
			)}
			onClick={navigateToFolder}
			onKeyPress={(e) => {
				if (e.key === "Enter") {
					navigateToFolder();
				}
			}}
		>
			<div class="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100">
				<ActionDropdown
					actions={[
						{
							label: T()("edit"),
							type: "button",
							onClick: () => {
								props.rowTarget.setTargetId(props.folder.id);
								props.rowTarget.setTrigger("updateFolder", true);
							},
							permission: userStore.get.hasPermission(["update_media"]).all,
						},
					]}
					options={{
						border: true,
					}}
				/>
			</div>
			<Show when={hasUpdatePermission()}>
				<Checkbox
					value={isSelected()}
					onChange={() => {
						if (isSelected()) {
							mediaStore.get.removeSelectedFolder(props.folder.id);
						} else {
							mediaStore.get.addSelectedFolder(props.folder.id);
						}
					}}
					copy={{}}
					noMargin={true}
					fullWidth={false}
				/>
			</Show>
			<div class="w-full flex flex-col -mt-px">
				<div class="flex items-center gap-2 mb-1">
					<FaSolidFolder size={18} />
					<p
						class="text-sm font-medium text-title line-clamp-1"
						title={props.folder.title}
					>
						{props.folder.title}
					</p>
				</div>
				<p class="text-sm text-body">
					{props.folder.folderCount} {T()("folders")}, {props.folder.mediaCount}{" "}
					{T()("media")}
				</p>
			</div>
		</li>
	);
};
