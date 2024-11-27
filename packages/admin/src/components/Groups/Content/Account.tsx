import T, {
	getLocale,
	setLocale,
	localesConfig,
	type SupportedLocales,
} from "@/translations";
import { type Component, createMemo } from "solid-js";
import userStore from "@/store/userStore";
import Layout from "@/components/Groups/Layout";
import InfoRow from "@/components/Blocks/InfoRow";
import UpdateAccountForm from "@/components/Forms/Account/UpdateAccountForm";
import Form from "@/components/Groups/Form";

export const Account: Component = () => {
	// ----------------------------------------
	// Memos
	const user = createMemo(() => userStore.get.user);

	// ----------------------------------------
	// Render
	return (
		<Layout.DynamicContent
			options={{
				padding: "30",
			}}
		>
			{/* Account Details */}
			<InfoRow.Root
				title={T()("account_details")}
				description={T()("account_details_description")}
			>
				<InfoRow.Content>
					<UpdateAccountForm
						firstName={user()?.firstName ?? undefined}
						lastName={user()?.lastName ?? undefined}
						username={user()?.username ?? undefined}
						email={user()?.email ?? undefined}
					/>
				</InfoRow.Content>
			</InfoRow.Root>

			{/* Configuration */}
			<InfoRow.Root
				title={T()("configuration")}
				description={T()("configuration_description")}
			>
				<InfoRow.Content
					title={T()("cms_locale")}
					description={T()("cms_locale_description")}
				>
					<Form.Select
						id={"cms-locale"}
						value={getLocale()}
						options={localesConfig.map((locale) => ({
							label: locale.name || locale.code,
							value: locale.code,
						}))}
						onChange={(value) => {
							setLocale(value as SupportedLocales);
						}}
						name={"cms-locale"}
						noClear={true}
						theme={"basic"}
					/>
				</InfoRow.Content>
			</InfoRow.Root>
		</Layout.DynamicContent>
	);
};
