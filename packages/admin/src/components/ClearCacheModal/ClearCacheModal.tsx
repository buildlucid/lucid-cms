import type { Component } from "solid-js";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

interface ClearCacheProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const ClearCacheModal: Component<ClearCacheProps> = (props) => {
	// ----------------------------------------
	// Mutations
	const clearCache = api.settings.useClearKV({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});

	// ------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.system.cache.title")}
			description={T()("modals.system.cache.description")}
			loading={clearCache.action.isPending}
			error={clearCache.errors()?.message}
			onConfirm={() => {
				clearCache.action.mutate({});
			}}
			onCancel={() => {
				props.state.setOpen(false);
				clearCache.reset();
			}}
		/>
	);
};

export default ClearCacheModal;
