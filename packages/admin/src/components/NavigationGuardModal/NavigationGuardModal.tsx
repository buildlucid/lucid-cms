import type { Component } from "solid-js";
import { ConfirmationModal } from "@/components/ConfirmationModal/ConfirmationModal";
import type { NavigationGuardState } from "@/hooks/useNavigationGuard/useNavigationGuard";
import T from "@/translations";

interface NavigationGuardProps {
	state: NavigationGuardState;
}

const NavigationGuardModal: Component<NavigationGuardProps> = (props) => {
	// ------------------------------
	// Render
	return (
		<ConfirmationModal
			state={{
				open: props.state.isOpen(),
				setOpen: (open) => {
					if (!open) props.state.cancel();
				},
			}}
			copy={{
				title: T()("modals.navigation.guard.title"),
				description: T()("modals.navigation.guard.description"),
			}}
			callbacks={{
				onConfirm: () => {
					props.state.proceed();
				},
				onCancel: () => {
					props.state.cancel();
				},
			}}
		/>
	);
};

export default NavigationGuardModal;
