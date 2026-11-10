import { TbOutlinePhotoPlus } from "solid-icons/tb";
import type { Component } from "solid-js";
import Tooltip from "@/components/Tooltip/Tooltip";
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
			<Tooltip
				type="button"
				class="ms-auto flex items-center justify-center rounded-sm border border-transparent p-1.5 text-body transition-colors hover:bg-background-hover hover:text-title focus-ring disabled:cursor-not-allowed disabled:opacity-50"
				disabled={props.disabled}
				aria-label={T()("bug.report.images.add")}
				content={T()("bug.report.images.add")}
				onMouseDown={(event) => event.preventDefault()}
				onClick={() => fileInput?.click()}
			>
				<TbOutlinePhotoPlus size={12} />
			</Tooltip>
		</>
	);
};

export default BugReportAttachButton;
