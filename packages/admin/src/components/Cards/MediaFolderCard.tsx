import { useLocation, useNavigate } from "@solidjs/router";
import { createDraggable, createDroppable } from "@thisbeyond/solid-dnd";
import type { MediaFolder } from "@types";
import classNames from "classnames";
import { type Accessor, type Component, createMemo, Show } from "solid-js";
import { Checkbox } from "@/components/Groups/Form";
import ActionDropdown from "@/components/Partials/ActionDropdown";
import { Permissions } from "@/constants/permissions";
import { useInterfaceDirection } from "@/hooks/useInterfaceDirection";
import type useRowTarget from "@/hooks/useRowTarget";
import mediaStore from "@/store/mediaStore";
import userStore from "@/store/userStore";
import T from "@/translations";

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
	folder: MediaFolder;
	isDragging: Accessor<boolean>;
	rowTarget: ReturnType<typeof useRowTarget<"deleteFolder" | "updateFolder">>;
}> = (props) => {
	// ----------------------------------
	// Hooks
	// biome-ignore lint/correctness/noUnusedVariables: it is being used
	const draggable = createDraggable(`folder:${props.folder.id}`);
	const droppable = createDroppable(`folder:${props.folder.id}`);

	// ----------------------------------
	// State & Hooks
	const location = useLocation();
	const navigate = useNavigate();
	const interfaceDirection = useInterfaceDirection();

	// ----------------------------------
	// Memos
	const hasUpdatePermission = createMemo(() => {
		return userStore.get.hasPermission([Permissions.MediaUpdate]).all;
	});
	const hasDeletePermission = createMemo(() => {
		return userStore.get.hasPermission([Permissions.MediaDelete]).all;
	});
	const isSelected = createMemo(() => {
		return mediaStore.get.selectedFolders.includes(props.folder.id);
	});
	const getPath = createMemo(() => {
		return `/lucid/media/${props.folder.id}?${location.search}`;
	});

	// ----------------------------------
	// Handlers
	const navigateToFolder = (event?: MouseEvent) => {
		if (props.isDragging()) return;
		if (event?.shiftKey && hasUpdatePermission()) {
			if (isSelected()) {
				mediaStore.get.removeSelectedFolder(props.folder.id);
			} else {
				mediaStore.get.addSelectedFolder(props.folder.id);
			}
			return;
		}
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
			<div
				class={classNames(
					"absolute top-3 z-10 opacity-0 group-hover:opacity-100",
					{
						"right-3": interfaceDirection.isLTR(),
						"left-3": interfaceDirection.isRTL(),
					},
				)}
			>
				<ActionDropdown
					actions={[
						{
							label: T()("common.edit"),
							type: "button",
							icon: "pen",
							onClick: () => {
								props.rowTarget.setTargetId(props.folder.id);
								props.rowTarget.setTrigger("updateFolder", true);
							},
							permission: userStore.get.hasPermission([Permissions.MediaUpdate])
								.all,
						},
						{
							label: T()("common.delete"),
							type: "button",
							icon: "trash",
							onClick: () => {
								props.rowTarget.setTargetId(props.folder.id);
								props.rowTarget.setTrigger("deleteFolder", true);
							},
							permission: hasDeletePermission(),
						},
					]}
					options={{
						border: true,
						placement: interfaceDirection.isRTL()
							? "bottom-start"
							: "bottom-end",
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
				<div class="flex items-center gap-2 mb-0.5">
					<p
						class="text-sm font-medium text-title line-clamp-1"
						title={props.folder.title}
					>
						{props.folder.title}
					</p>
				</div>
				<p class="text-sm text-body">
					{props.folder.folderCount} {T()("common.folders")},{" "}
					{props.folder.mediaCount} {T()("common.media")}
				</p>
			</div>
		</li>
	);
};
