import { type Component, createMemo } from "solid-js";
import Alert from "@/components/Blocks/Alert";
import { Account } from "@/components/Groups/Content";
import { Standard } from "@/components/Groups/Headers";
import { Wrapper } from "@/components/Groups/Layout";
import MediaAltGenerationModal from "@/components/Modals/AI/MediaAltGenerationModal";
import userStore from "@/store/userStore";
import T from "@/translations";

const AccountRoute: Component = () => {
	// ----------------------------------------
	// Memos
	const user = createMemo(() => userStore.get.user);

	// ----------------------------------------
	// Render
	return (
		<Wrapper
			slots={{
				topBar: (
					<Alert
						style="layout"
						alerts={[
							{
								type: "error",
								message: T()("auth.password.reset.required.message"),
								show: user()?.triggerPasswordReset === true,
							},
						]}
					/>
				),
				header: (
					<Standard
						copy={{
							title: T()("routes.account.title"),
							description: T()("routes.account.description"),
						}}
					/>
				),
			}}
		>
			<MediaAltGenerationModal />
			<Account />
		</Wrapper>
	);
};

export default AccountRoute;
