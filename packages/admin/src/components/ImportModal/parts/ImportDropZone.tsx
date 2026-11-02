import classNames from "classnames";
import { TbOutlineUpload } from "solid-icons/tb";
import { type Component, createSignal, Show } from "solid-js";
import Spinner from "@/components/Spinner/Spinner";
import T from "@/translations";

export const ImportDropZone: Component<{
	checking: boolean;
	onBrowse: () => void;
	onFiles: (_files: File[]) => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [dragOver, setDragOver] = createSignal(false);

	// ----------------------------------------
	// Render
	return (
		<button
			type="button"
			class={classNames(
				"flex min-h-72 flex-col items-center justify-center rounded-md border-2 border-dashed p-6 text-center transition-colors focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary",
				{
					"border-primary bg-primary-low": dragOver(),
					"border-border": !dragOver(),
				},
			)}
			disabled={props.checking}
			onClick={() => props.onBrowse()}
			onDragOver={(event) => {
				event.preventDefault();
				setDragOver(true);
			}}
			onDragLeave={(event) => {
				event.preventDefault();
				if (event.currentTarget === event.target) setDragOver(false);
			}}
			onDrop={(event) => {
				event.preventDefault();
				setDragOver(false);
				props.onFiles(Array.from(event.dataTransfer?.files ?? []));
			}}
		>
			<Show
				when={!props.checking}
				fallback={
					<>
						<Spinner size="sm" class="mb-2" />
						<p class="text-sm font-medium text-subtitle">
							{T()("transfer.import.checking")}
						</p>
					</>
				}
			>
				<TbOutlineUpload size={18} class="mb-2 text-muted" />
				<p class="text-sm font-medium text-subtitle">
					{T()("transfer.import.drop.title")}{" "}
					<span class="text-primary">{T()("transfer.import.drop.browse")}</span>
				</p>
				<p class="mt-1 text-xs text-body">
					{T()("transfer.import.drop.description")}
				</p>
			</Show>
		</button>
	);
};
