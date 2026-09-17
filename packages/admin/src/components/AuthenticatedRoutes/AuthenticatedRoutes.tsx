import {
	createEffect,
	createSignal,
	type ParentComponent,
	Show,
} from "solid-js";
import Spinner from "@/components/Spinner/Spinner";
import UpdatePasswordModal from "@/components/UpdatePasswordModal/UpdatePasswordModal";
import api from "@/services/api";
import { getReady, initAdminTranslations } from "@/translations";

/** Checks the session before mounting protected layouts and route components. */
const AuthenticatedRoutes: ParentComponent = (props) => {
	// ----------------------------------
	// State & Hooks
	const [translationsInitialized, setTranslationsInitialized] = createSignal(
		getReady(),
	);
	const [forcedPasswordModalOpen, setForcedPasswordModalOpen] =
		createSignal(false);

	// ----------------------------------
	// Queries
	const authenticatedUser = api.account.useGetAuthenticatedUser({
		queryParams: {},
	});

	// ----------------------------------
	// Effects
	createEffect(() => {
		if (!authenticatedUser.isSuccess) return;
		setForcedPasswordModalOpen(
			authenticatedUser.data.data.triggerPasswordReset === true,
		);
		if (!translationsInitialized()) {
			void initAdminTranslations().finally(() =>
				setTranslationsInitialized(true),
			);
		}
	});

	// ----------------------------------
	// Render
	return (
		<Show
			when={authenticatedUser.isSuccess && translationsInitialized()}
			fallback={
				<div class="min-h-screen grid place-items-center" role="status">
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
				options={{ forced: true }}
			/>
		</Show>
	);
};

export default AuthenticatedRoutes;
