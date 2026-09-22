import classNames from "classnames";
import {
	type Accessor,
	type Component,
	createMemo,
	createSignal,
	type Setter,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import Modal from "@/components/Modal/Modal";
import T from "@/translations";

interface TableSelectActionProps {
	selectedCount: Accessor<number>;
	selected: Accessor<boolean[]>;
	setSelected: Setter<boolean[]>;
	callbacks: {
		delete: ((_selected: boolean[]) => Promise<void>) | undefined;
		restore: ((_selected: boolean[]) => Promise<void>) | undefined;
		deletePermanently: ((_selected: boolean[]) => Promise<void>) | undefined;
	};
	allowRestore: boolean;
	allowDelete: boolean;
	allowDeletePermanently: boolean;
}

const TableSelectAction: Component<TableSelectActionProps> = (props) => {
	// ----------------------------------------
	// State
	const [deleteModalOpen, setDeleteModalOpen] = createSignal(false);
	const [restoreModalOpen, setRestoreModalOpen] = createSignal(false);
	const [deletePermanentlyModalOpen, setDeletePermanentlyModalOpen] =
		createSignal(false);
	const [isDeleting, setIsDeleting] = createSignal(false);
	const [isRestoring, setIsRestoring] = createSignal(false);
	const [isDeletingPermanently, setIsDeletingPermanently] = createSignal(false);

	// ----------------------------------------
	// Memos
	const shouldShow = createMemo(() => {
		if (props.selectedCount() === 0) return false;
		if (
			!props.callbacks.delete &&
			!props.callbacks.restore &&
			!props.callbacks.deletePermanently
		)
			return false;
		return true;
	});
	const showDeleteAction = createMemo(() => {
		if (!props.allowDelete) return false;
		if (!props.callbacks.delete) return false;
		return true;
	});
	const showRestoreAction = createMemo(() => {
		if (!props.allowRestore) return false;
		if (!props.callbacks.restore) return false;
		return true;
	});
	const showDeletePermanentlyAction = createMemo(() => {
		if (!props.allowDeletePermanently) return false;
		if (!props.callbacks.deletePermanently) return false;
		return true;
	});
	const isWidePill = createMemo(() => {
		let count = 1; // reset
		if (showRestoreAction()) count++;
		if (showDeleteAction()) count++;
		if (showDeletePermanentlyAction()) count++;
		return count > 2;
	});

	// ----------------------------------------
	// Handlers
	const resetHandler = () => props.setSelected((prev) => prev.map(() => false));
	const deleteHandler = async () => {
		if (props.callbacks?.delete) {
			setIsDeleting(true);
			try {
				await props.callbacks.delete(props.selected());
				props.setSelected((prev) => prev.map(() => false));
				setDeleteModalOpen(false);
			} finally {
				setIsDeleting(false);
			}
		}
	};
	const restoreHandler = async () => {
		if (props.callbacks?.restore) {
			setIsRestoring(true);
			try {
				await props.callbacks.restore(props.selected());
				props.setSelected((prev) => prev.map(() => false));
				setRestoreModalOpen(false);
			} finally {
				setIsRestoring(false);
			}
		}
	};
	const deletePermanentlyHandler = async () => {
		if (props.callbacks?.deletePermanently) {
			setIsDeletingPermanently(true);
			try {
				await props.callbacks.deletePermanently(props.selected());
				props.setSelected((prev) => prev.map(() => false));
				setDeletePermanentlyModalOpen(false);
			} finally {
				setIsDeletingPermanently(false);
			}
		}
	};

	// ----------------------------------------
	// Render
	return (
		<>
			<Show when={shouldShow()}>
				<div class="fixed bottom-4 md:bottom-6 left-0 md:left-[220px] right-0 flex justify-center items-center z-40 pointer-events-none px-4">
					<div
						class={classNames(
							"pointer-events-auto bg-card-base p-2 border border-border rounded-md w-full justify-between flex items-center",
							isWidePill() ? "max-w-[460px]" : "max-w-[400px]",
						)}
					>
						<p class="text-sm">
							<span class="font-bold">
								{props.selectedCount() > 1
									? `${props.selectedCount()} ${T()("common.items")}`
									: `1 ${T()("common.item")}`}
							</span>{" "}
							{T()("common.selected")}
						</p>
						<div class="ml-2 flex gap-2">
							<Button variant="outline" size="sm" onClick={resetHandler}>
								{T()("common.reset")}
							</Button>
							<Show when={showRestoreAction()}>
								<Button
									variant="primary"
									size="sm"
									onClick={() => setRestoreModalOpen(true)}
								>
									{T()("common.restore")}
								</Button>
							</Show>
							<Show when={showDeleteAction()}>
								<Button
									variant="danger"
									size="sm"
									onClick={() => setDeleteModalOpen(true)}
								>
									{T()("common.delete")}
								</Button>
							</Show>
							<Show when={showDeletePermanentlyAction()}>
								<Button
									variant="danger"
									size="sm"
									onClick={() => setDeletePermanentlyModalOpen(true)}
								>
									{T()("common.delete")}
								</Button>
							</Show>
						</div>
					</div>
				</div>
			</Show>
			<Show when={showDeleteAction()}>
				<Modal.Confirm
					open={deleteModalOpen()}
					onOpenChange={setDeleteModalOpen}
					title={T()("modals.common.delete.items.title")}
					description={T()("modals.common.delete.items.description")}
					loading={isDeleting()}
					onConfirm={deleteHandler}
					onCancel={() => {
						setDeleteModalOpen(false);
					}}
				/>
			</Show>
			<Show when={showDeletePermanentlyAction()}>
				<Modal.Confirm
					open={deletePermanentlyModalOpen()}
					onOpenChange={setDeletePermanentlyModalOpen}
					title={T()("modals.common.delete.items.permanently.title")}
					description={T()(
						"modals.common.delete.items.permanently.description",
					)}
					loading={isDeletingPermanently()}
					onConfirm={deletePermanentlyHandler}
					onCancel={() => {
						setDeletePermanentlyModalOpen(false);
					}}
				/>
			</Show>
			<Show when={showRestoreAction()}>
				<Modal.Confirm
					open={restoreModalOpen()}
					onOpenChange={setRestoreModalOpen}
					title={T()("modals.common.restore.items.title")}
					description={T()("modals.common.restore.items.description")}
					confirmVariant="primary"
					loading={isRestoring()}
					onConfirm={restoreHandler}
					onCancel={() => {
						setRestoreModalOpen(false);
					}}
				/>
			</Show>
		</>
	);
};

export default TableSelectAction;
