import type { Accessor, Component } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import T from "@/translations";

const RestoreRevision: Component<{
	versionId: Accessor<number | null>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	loading?: boolean;
	error?: string;
	callbacks: {
		onConfirm: (versionId: number) => void | Promise<void>;
		onCancel: () => void;
	};
}> = (props) => {
	return (
		<Confirmation
			theme="primary"
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: props.loading,
				isError: !!props.error,
			}}
			copy={{
				title: T()("restore_revision_modal_title"),
				description: T()("restore_revision_modal_description", {
					id: props.versionId() ?? "",
				}),
				error: props.error,
			}}
			callbacks={{
				onConfirm: async () => {
					const versionId = props.versionId();
					if (versionId === null) return console.error("No versionId provided");
					await props.callbacks.onConfirm(versionId);
				},
				onCancel: props.callbacks.onCancel,
			}}
		/>
	);
};

export default RestoreRevision;
