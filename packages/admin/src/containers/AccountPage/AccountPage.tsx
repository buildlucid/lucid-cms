import type { Component } from "solid-js";
import { AccountContent } from "@/components/AccountContent/AccountContent";
import MediaAltGenerationModal from "@/components/MediaAltGenerationModal/MediaAltGenerationModal";
import MediaImageGenerationModal from "@/components/MediaImageGenerationModal/MediaImageGenerationModal";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import T from "@/translations";

const AccountPage: Component = () => {
	// ----------------------------------------
	// Render
	return (
		<PageLayout
			slots={{
				header: (
					<PageHeader
						copy={{
							title: T()("routes.account.title"),
							description: T()("routes.account.description"),
						}}
					/>
				),
			}}
		>
			<MediaAltGenerationModal />
			<MediaImageGenerationModal />
			<AccountContent />
		</PageLayout>
	);
};

export default AccountPage;
