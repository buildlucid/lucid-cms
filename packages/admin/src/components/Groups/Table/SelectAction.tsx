import T from "@/translations";
import {
	type Accessor,
	createMemo,
	type Setter,
	Show,
	type Component,
} from "solid-js";
import Button from "@/components/Partials/Button";

interface SelectActionProps {
	selectedCount: Accessor<number>;
	selected: Accessor<boolean[]>;
	setSelected: Setter<boolean[]>;
	callbacks: {
		delete: ((_selected: boolean[]) => Promise<void>) | undefined;
		restore: ((_selected: boolean[]) => Promise<void>) | undefined;
	};
}

export const SelectAction: Component<SelectActionProps> = (props) => {
	// ----------------------------------------
	// Memos
	const shouldShow = createMemo(() => {
		if (props.selectedCount() === 0) return false;
		if (!props.callbacks.delete && !props.callbacks.restore) return false;
		return true;
	});
	const showDeleteAction = createMemo(() => {
		if (!props.callbacks.delete) return false;
		return true;
	});
	const showRestoreAction = createMemo(() => {
		if (!props.callbacks.restore) return false;
		return true;
	});

	// ----------------------------------------
	// Handlers
	const resetHandler = () => props.setSelected((prev) => prev.map(() => false));
	const deleteHandler = async () => {
		if (props.callbacks?.delete) {
			await props.callbacks.delete(props.selected());
			props.setSelected((prev) => prev.map(() => false));
		}
	};
	const restoreHandler = async () => {
		if (props.callbacks?.restore) {
			await props.callbacks.restore(props.selected());
			props.setSelected((prev) => prev.map(() => false));
		}
	};

	// ----------------------------------------
	// Render
	return (
		<Show when={shouldShow()}>
			<div class="fixed bottom-4 md:bottom-6 left-[220px] right-0 flex justify-center items-center z-40 pointer-events-none px-4">
				<div class="pointer-events-auto bg-card-base p-2 border border-border rounded-md max-w-[400px] w-full justify-between flex items-center">
					<p class="text-sm">
						<span class="font-bold">
							{props.selectedCount() > 1
								? `${props.selectedCount()} ${T()("items")}`
								: `1 ${T()("item")}`}
						</span>{" "}
						{T()("selected")}
					</p>
					<div class="ml-2 flex gap-2">
						<Button theme="border-outline" size="small" onClick={resetHandler}>
							{T()("reset")}
						</Button>
						<Show when={showRestoreAction()}>
							<Button theme="primary" size="small" onClick={restoreHandler}>
								{T()("restore")}
							</Button>
						</Show>
						<Show when={showDeleteAction()}>
							<Button theme="danger" size="small" onClick={deleteHandler}>
								{T()("delete")}
							</Button>
						</Show>
					</div>
				</div>
			</div>
		</Show>
	);
};
