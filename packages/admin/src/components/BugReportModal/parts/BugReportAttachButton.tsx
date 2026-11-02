import { TbOutlinePhotoPlus } from "solid-icons/tb";
import type { Component } from "solid-js";
import T from "@/translations";

const BugReportAttachButton: Component<{
	disabled: boolean;
	onAdd: (_files: File[]) => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	let fileInput: HTMLInputElement | undefined;

	// ----------------------------------------
	// Render
	return (
		<>
			<input
				ref={fileInput}
				type="file"
				accept="image/*"
				multiple
				class="hidden"
				tabIndex={-1}
				aria-hidden="true"
				onChange={(event) => {
					props.onAdd(Array.from(event.currentTarget.files ?? []));
					event.currentTarget.value = "";
				}}
			/>
			<button
				type="button"
				class="ms-auto flex items-center justify-center rounded border border-transparent p-1.5 text-body transition-colors duration-150 hover:bg-background-hover hover:text-title focus-visible:ring-1 focus-visible:ring-primary outline-none disabled:cursor-not-allowed disabled:opacity-50"
				disabled={props.disabled}
				aria-label={T()("bug.report.images.add")}
				title={T()("bug.report.images.add")}
				onMouseDown={(event) => event.preventDefault()}
				onClick={() => fileInput?.click()}
			>
				<TbOutlinePhotoPlus size={12} />
			</button>
		</>
	);
};

export default BugReportAttachButton;
