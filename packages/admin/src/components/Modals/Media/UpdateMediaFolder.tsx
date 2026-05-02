import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
} from "solid-js";
import { Input, Select } from "@/components/Groups/Form";
import { Modal, ModalFooter } from "@/components/Groups/Modal";
import Button from "@/components/Partials/Button";
import ErrorMessage from "@/components/Partials/ErrorMessage";
import api from "@/services/api";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";

const UpdateMediaFolderModal: Component<{
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
		parentFolderId: Accessor<number | string | undefined>;
	};
}> = (props) => {
	// -----------------------------
	// State
	const [getTitle, setTitle] = createSignal<string>("");
	const [getSelectedParentId, setSelectedParentId] = createSignal<
		number | null | undefined
	>(undefined);

	// ----------------------------------------
	// Queries / Mutations
	const foldersHierarchy = api.mediaFolders.useGetHierarchy({
		queryParams: {},
	});

	const updateFolder = api.mediaFolders.useUpdateSingle({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});

	// -----------------------------
	// Memos
	const folderOptions = createMemo(() => {
		const folders = foldersHierarchy.data?.data || [];
		const currentId = props.id();
		const sorted = folders
			.slice()
			.sort((a, b) => (a.meta?.order ?? 0) - (b.meta?.order ?? 0))
			.filter((f) => f.id !== currentId)
			.map((f) => {
				let label = f.meta?.label ?? f.title;
				if (f.meta?.level && f.meta?.level > 0) label = `| ${label}`;
				return { value: f.id, label: label };
			});

		return [{ value: undefined, label: T()("no_folder") }, ...sorted];
	});

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (props.state.open) {
			const currentId = props.id();
			const folders = foldersHierarchy.data?.data || [];
			const current = folders.find((f) => f.id === currentId);
			if (current) {
				setTitle(current.title);
				setSelectedParentId(current.parentFolderId ?? null);
			}
		}
		if (!props.state.open) {
			updateFolder.reset();
			setTitle("");
			setSelectedParentId(undefined);
		}
	});

	// -----------------------------
	// Render
	return (
		<Modal
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
			}}
			options={{
				noPadding: true,
			}}
		>
			<form
				class="w-full"
				onSubmit={(e) => {
					e.preventDefault();
					const id = props.id();
					if (!id) return;
					updateFolder.action.mutate({
						id: id,
						body: {
							title: getTitle(),
							parentFolderId: getSelectedParentId() ?? null,
						},
					});
				}}
			>
				<div class="p-4 md:p-6">
					<div class="mb-4">
						<h2 class="text-base font-semibold text-title">
							{T()("update_media_folder_panel_title")}
						</h2>
					</div>
					<Input
						id="title"
						value={getTitle()}
						onChange={setTitle}
						name={"title"}
						type="text"
						required={true}
						copy={{
							label: T()("title"),
						}}
						errors={getBodyError("title", updateFolder.errors)}
					/>
					<Select
						id="parent-folder"
						value={getSelectedParentId() ?? undefined}
						onChange={(val) => {
							const id =
								typeof val === "string"
									? Number.parseInt(val, 10)
									: (val as number | undefined);
							setSelectedParentId(id ?? null);
						}}
						name={"parent-folder"}
						options={folderOptions()}
						copy={{ label: T()("folder") }}
						noClear={true}
						errors={getBodyError("parentFolderId", updateFolder.errors)}
					/>
				</div>
				<ModalFooter>
					<div class="min-w-0">
						<ErrorMessage
							theme="basic"
							message={updateFolder.errors()?.message}
						/>
						<ErrorMessage
							theme="basic"
							message={
								foldersHierarchy.isError ? T()("error_message") : undefined
							}
						/>
					</div>
					<div class="flex min-w-max gap-2">
						<Button
							type="button"
							theme="border-outline"
							size="medium"
							onClick={() => props.state.setOpen(false)}
							disabled={updateFolder.action.isPending}
						>
							{T()("cancel")}
						</Button>
						<Button
							type="submit"
							theme="primary"
							size="medium"
							loading={updateFolder.action.isPending}
							disabled={foldersHierarchy.isLoading}
						>
							{T()("update")}
						</Button>
					</div>
				</ModalFooter>
			</form>
		</Modal>
	);
};

export default UpdateMediaFolderModal;
