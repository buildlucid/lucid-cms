import type { DocumentVersionType } from "@types";
import type { Accessor, Component } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import T from "@/translations";

const ReleaseEnvironment: Component<{
	target: Accessor<Exclude<DocumentVersionType, "revision"> | null>;
	environmentLabel: Accessor<string>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	loading?: boolean;
	error?: string;
	callbacks: {
		onConfirm: (
			target: Exclude<DocumentVersionType, "revision">,
		) => void | Promise<void>;
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
				title: T()("release_environment_modal_title", {
					environment: props.environmentLabel() ?? "",
				}),
				description: T()("release_environment_modal_description", {
					environment: props.environmentLabel() ?? "",
				}),
				error: props.error,
			}}
			callbacks={{
				onConfirm: async () => {
					const target = props.target();
					if (!target) return console.error("No release target provided");
					await props.callbacks.onConfirm(target);
				},
				onCancel: props.callbacks.onCancel,
			}}
		/>
	);
};

export default ReleaseEnvironment;
