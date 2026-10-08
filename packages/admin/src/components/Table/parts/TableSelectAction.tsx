import { TbOutlineX } from "solid-icons/tb";
import {
	type Accessor,
	type Component,
	createMemo,
	createSignal,
	type Setter,
	Show,
} from "solid-js";
import Button, { type ButtonVariant } from "@/components/Button/Button";
import Modal from "@/components/Modal/Modal";
import SplitButton, {
	type SplitButtonAction,
} from "@/components/SplitButton/SplitButton";
import T from "@/translations";

export interface TableSelectActionItem {
	label: string;
	/** @default "outline" */
	variant?: ButtonVariant;
	confirm?: {
		title: string;
		description?: string;
		/** @default "primary" */
		confirmVariant?: ButtonVariant;
	};
	onClick: (_selected: boolean[]) => Promise<void>;
}

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
	actions: TableSelectActionItem[];
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
	const [pendingAction, setPendingAction] =
		createSignal<TableSelectActionItem>();
	const [isRunningAction, setIsRunningAction] = createSignal(false);

	// ----------------------------------------
	// Memos
	const shouldShow = createMemo(() => {
		if (props.selectedCount() === 0) return false;
		if (
			!props.callbacks.delete &&
			!props.callbacks.restore &&
			!props.callbacks.deletePermanently &&
			props.actions.length === 0
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
	//* the built-in actions come first, so the first one is the main button
	const items = createMemo<
		Array<{ label: string; variant: ButtonVariant; onSelect: () => void }>
	>(() => [
		...(showRestoreAction()
			? [
					{
						label: T()("common.restore"),
						variant: "primary" as const,
						onSelect: () => setRestoreModalOpen(true),
					},
				]
			: []),
		...(showDeleteAction()
			? [
					{
						label: T()("common.delete"),
						variant: "danger" as const,
						onSelect: () => setDeleteModalOpen(true),
					},
				]
			: []),
		...(showDeletePermanentlyAction()
			? [
					{
						label: T()("common.delete"),
						variant: "danger" as const,
						onSelect: () => setDeletePermanentlyModalOpen(true),
					},
				]
			: []),
		...props.actions.map((action) => ({
			label: action.label,
			variant: action.variant ?? ("outline" as const),
			onSelect: () => {
				setPendingAction(action);
				if (!action.confirm) void runAction(action);
			},
		})),
	]);
	const mainItem = createMemo(() => items()[0]);
	//* the main button's variant only makes sense for the menu's danger items
	const menuItems = createMemo<SplitButtonAction[]>(() =>
		items()
			.slice(1)
			.map((item) => ({
				label: item.label,
				onSelect: item.onSelect,
				variant: item.variant === "danger" ? "danger" : undefined,
			})),
	);

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
	const runAction = async (action: TableSelectActionItem) => {
		setIsRunningAction(true);
		try {
			await action.onClick(props.selected());
			props.setSelected((prev) => prev.map(() => false));
			setPendingAction(undefined);
		} finally {
			setIsRunningAction(false);
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
				<div class="fixed bottom-4 md:bottom-6 left-0 md:left-sidebar right-0 flex justify-center items-center z-40 pointer-events-none px-4">
					<div class="pointer-events-auto flex w-full max-w-100 items-center justify-between gap-3 rounded-md border border-border bg-card p-2">
						<div class="flex min-w-0 items-center gap-1">
							<Button
								variant="ghost"
								size="sm"
								shape="square"
								onClick={resetHandler}
								aria-label={T()("common.reset")}
								title={T()("common.reset")}
							>
								<TbOutlineX size={12} />
							</Button>
							<p class="truncate text-sm">
								<span class="font-bold">
									{props.selectedCount() > 1
										? `${props.selectedCount()} ${T()("common.items")}`
										: `1 ${T()("common.item")}`}
								</span>{" "}
								{T()("common.selected")}
							</p>
						</div>
						<Show when={mainItem()}>
							{(main) => (
								<Show
									when={menuItems().length > 0}
									fallback={
										<Button
											variant={main().variant}
											size="sm"
											loading={isRunningAction()}
											onClick={main().onSelect}
										>
											{main().label}
										</Button>
									}
								>
									<SplitButton
										label={main().label}
										variant={main().variant}
										size="sm"
										loading={isRunningAction()}
										onClick={main().onSelect}
										actions={menuItems()}
									/>
								</Show>
							)}
						</Show>
					</div>
				</div>
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
