import {
	type Accessor,
	createMemo,
	createSignal,
	type JSXElement,
	Show,
} from "solid-js";
import type { ActionIconName } from "@/components/ActionIcon/ActionIcon";
import type { ButtonVariant } from "@/components/Button/Button";
import Modal from "@/components/Modal/Modal";
import SelectionBar, {
	type SelectionBarAction,
} from "@/components/SelectionBar/SelectionBar";
import T from "@/translations";

export interface TableSelectActionItem<TRow> {
	label: string;
	/** Shown beside it in the actions menu. */
	icon: ActionIconName;
	/** @default "outline" */
	variant?: ButtonVariant;
	confirm?: {
		title: string;
		description?: string;
		/** @default "primary" */
		confirmVariant?: ButtonVariant;
	};
	/** Receives the selected rows, including ones on other pages. */
	onClick: (_rows: TRow[]) => Promise<void>;
}

interface TableSelectActionProps<TRow> {
	selectedCount: Accessor<number>;
	rows: Accessor<TRow[]>;
	clear: () => void;
	callbacks: {
		delete: ((_rows: TRow[]) => Promise<void>) | undefined;
		restore: ((_rows: TRow[]) => Promise<void>) | undefined;
		deletePermanently: ((_rows: TRow[]) => Promise<void>) | undefined;
	};
	allowRestore: boolean;
	allowDelete: boolean;
	allowDeletePermanently: boolean;
	actions: TableSelectActionItem<TRow>[];
}

const TableSelectAction = <TRow,>(
	props: TableSelectActionProps<TRow>,
): JSXElement => {
	// ----------------------------------------
	// State
	const [deleteModalOpen, setDeleteModalOpen] = createSignal(false);
	const [restoreModalOpen, setRestoreModalOpen] = createSignal(false);
	const [deletePermanentlyModalOpen, setDeletePermanentlyModalOpen] =
		createSignal(false);
	const [isDeleting, setIsDeleting] = createSignal(false);
	const [isRestoring, setIsRestoring] = createSignal(false);
	const [isDeletingPermanently, setIsDeletingPermanently] = createSignal(false);
	const [pendingAction, setPendingAction] =
		createSignal<TableSelectActionItem<TRow>>();
	const [isRunningAction, setIsRunningAction] = createSignal(false);

	// ----------------------------------------
	// Memos
	const showDeleteAction = createMemo(
		() => props.allowDelete && props.callbacks.delete !== undefined,
	);
	const showRestoreAction = createMemo(
		() => props.allowRestore && props.callbacks.restore !== undefined,
	);
	const showDeletePermanentlyAction = createMemo(
		() =>
			props.allowDeletePermanently &&
			props.callbacks.deletePermanently !== undefined,
	);
	//* the built-in actions come first, so the first one is the main button
	const items = createMemo<SelectionBarAction[]>(() => [
		...(showRestoreAction()
			? [
					{
						label: T()("common.restore"),
						icon: "restore" as const,
						variant: "primary" as const,
						onSelect: () => setRestoreModalOpen(true),
					},
				]
			: []),
		...(showDeleteAction()
			? [
					{
						label: T()("common.delete"),
						icon: "trash" as const,
						variant: "danger" as const,
						onSelect: () => setDeleteModalOpen(true),
					},
				]
			: []),
		...(showDeletePermanentlyAction()
			? [
					{
						label: T()("common.delete"),
						icon: "trash" as const,
						variant: "danger" as const,
						onSelect: () => setDeletePermanentlyModalOpen(true),
					},
				]
			: []),
		...props.actions.map((action) => ({
			label: action.label,
			icon: action.icon,
			variant: action.variant,
			onSelect: () => {
				setPendingAction(action);
				if (!action.confirm) void runAction(action);
			},
		})),
	]);

	// ----------------------------------------
	// Handlers
	const deleteHandler = async () => {
		if (props.callbacks?.delete) {
			setIsDeleting(true);
			try {
				await props.callbacks.delete(props.rows());
				props.clear();
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
				await props.callbacks.restore(props.rows());
				props.clear();
				setRestoreModalOpen(false);
			} finally {
				setIsRestoring(false);
			}
		}
	};
	const runAction = async (action: TableSelectActionItem<TRow>) => {
		setIsRunningAction(true);
		try {
			await action.onClick(props.rows());
			props.clear();
			setPendingAction(undefined);
		} finally {
			setIsRunningAction(false);
		}
	};
	const deletePermanentlyHandler = async () => {
		if (props.callbacks?.deletePermanently) {
			setIsDeletingPermanently(true);
			try {
				await props.callbacks.deletePermanently(props.rows());
				props.clear();
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
			<Show when={props.selectedCount() > 0 && items().length > 0}>
				<SelectionBar
					count={
						props.selectedCount() > 1
							? `${props.selectedCount()} ${T()("common.items")}`
							: `1 ${T()("common.item")}`
					}
					actions={items()}
					loading={isRunningAction()}
					onClear={props.clear}
				/>
			</Show>
			<Show when={pendingAction()?.confirm && pendingAction()}>
				{(action) => (
					<Modal.Confirm
						open={true}
						onOpenChange={(open) => {
							if (!open && !isRunningAction()) setPendingAction(undefined);
						}}
						title={action().confirm?.title ?? action().label}
						description={action().confirm?.description}
						confirmLabel={action().label}
						confirmVariant={action().confirm?.confirmVariant ?? "primary"}
						loading={isRunningAction()}
						onConfirm={() => void runAction(action())}
					/>
				)}
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
