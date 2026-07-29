import type { Component, JSXElement } from "solid-js";
import { createEffect, createSignal, Show } from "solid-js";
import UpdatePasswordModal from "@/components/Modals/User/UpdatePassword";
import Spinner from "@/components/Partials/Spinner";
import api from "@/services/api";
import AuthShell from "./AuthShell";

const OAuthRoutes: Component<{
	children?: JSXElement;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [forcedPasswordModalOpen, setForcedPasswordModalOpen] =
		createSignal(false);

	// ----------------------------------------
	// Queries
	const authenticatedUser = api.account.useGetAuthenticatedUser({
		queryParams: {},
	});

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!authenticatedUser.isSuccess) return;
		setForcedPasswordModalOpen(
			authenticatedUser.data.data.triggerPasswordReset === true,
		);
	});

	// ----------------------------------------
	// Render
	return (
		<AuthShell width="consent">
			<Show
				when={authenticatedUser.isSuccess}
				fallback={
					<div class="flex min-h-80 items-center justify-center">
						<Spinner size="sm" />
					</div>
				}
			>
				{props.children}
				<UpdatePasswordModal
					state={{
						open: forcedPasswordModalOpen(),
						setOpen: setForcedPasswordModalOpen,
					}}
					options={{
						forced: true,
					}}
				/>
			</Show>
		</AuthShell>
	);
};

export default OAuthRoutes;
