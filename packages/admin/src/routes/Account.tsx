import T from "@/translations";
import { createMemo, type Component } from "solid-js";
import userStore from "@/store/userStore";
import Alert from "@/components/Blocks/Alert";
import { Standard } from "@/components/Groups/Headers";
import { Wrapper } from "@/components/Groups/Layout";
import { Account } from "@/components/Groups/Content";

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
								message: T()("please_reset_password_message"),
								show: user()?.triggerPasswordReset === true,
							},
						]}
					/>
				),
				header: (
					<Standard
						copy={{
							title: T()("account_route_title"),
							description: T()("account_route_description"),
						}}
					/>
				),
			}}
		>
			<Account />
		</Wrapper>
	);
};

export default AccountRoute;
