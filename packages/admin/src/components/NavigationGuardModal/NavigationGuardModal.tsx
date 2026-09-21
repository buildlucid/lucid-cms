import type { Component } from "solid-js";
import Modal from "@/components/Modal/Modal";
import type { NavigationGuardState } from "@/hooks/useNavigationGuard/useNavigationGuard";
import T from "@/translations";

interface NavigationGuardProps {
	state: NavigationGuardState;
}

const NavigationGuardModal: Component<NavigationGuardProps> = (props) => {
	// ------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.state.isOpen()}
			onOpenChange={(open) => {
				if (!open) props.state.cancel();
			}}
			title={T()("modals.navigation.guard.title")}
			description={T()("modals.navigation.guard.description")}
			onConfirm={() => {
				props.state.proceed();
			}}
			onCancel={() => {
				props.state.cancel();
			}}
		/>
	);
};

export default NavigationGuardModal;
