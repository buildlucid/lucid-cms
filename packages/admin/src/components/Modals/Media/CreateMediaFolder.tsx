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

const CreateMediaFolderModal: Component<{
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

	// -----------------------------
	// Mutations
	const createFolder = api.mediaFolders.useCreateSingle({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});

	// ----------------------------------------
	// Queries
	const foldersHierarchy = api.mediaFolders.useGetHierarchy({
		queryParams: {},
	});

	// -----------------------------
	// Memos
	const resolveParentFolderId = createMemo(() => {
		const parent = props.state.parentFolderId();
		if (parent === "") return null;
		return typeof parent === "string" ? Number.parseInt(parent, 10) : parent;
	});

	const folderOptions = createMemo(() => {
		const folders = foldersHierarchy.data?.data || [];
		const sorted = folders
			.slice()
			.sort((a, b) => (a.meta?.order ?? 0) - (b.meta?.order ?? 0))
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
			setSelectedParentId(resolveParentFolderId());
		}
		if (!props.state.open) {
			createFolder.reset();
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
					createFolder.action.mutate({
						title: getTitle(),
						parentFolderId: getSelectedParentId() ?? null,
					});
				}}
			>
				<div class="p-4 md:p-6">
					<div class="mb-4">
						<h2 class="text-base font-semibold text-title">
							{T()("create_media_folder_panel_title")}
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
						errors={getBodyError("title", createFolder.errors)}
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
					/>
				</div>
				<ModalFooter>
					<div class="min-w-0">
						<ErrorMessage
							theme="basic"
							message={createFolder.errors()?.message}
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
							disabled={createFolder.action.isPending}
						>
							{T()("cancel")}
						</Button>
						<Button
							type="submit"
							theme="primary"
							size="medium"
							loading={createFolder.action.isPending}
							disabled={foldersHierarchy.isLoading}
						>
							{T()("create")}
						</Button>
					</div>
				</ModalFooter>
			</form>
		</Modal>
	);
};

export default CreateMediaFolderModal;
