import type { Component } from "solid-js";
import { AccountContent } from "@/components/AccountContent/AccountContent";
import MediaAltGenerationModal from "@/components/MediaAltGenerationModal/MediaAltGenerationModal";
import MediaImageGenerationModal from "@/components/MediaImageGenerationModal/MediaImageGenerationModal";
import PageLayout from "@/components/PageLayout/PageLayout";
import T from "@/translations";

const AccountPage: Component = () => {
	// ----------------------------------------
	// Render
	return (
		<PageLayout.Root>
			<PageLayout.Header
				title={T()("routes.account.title")}
				description={T()("routes.account.description")}
			/>
			<PageLayout.Body>
				<MediaAltGenerationModal />
				<MediaImageGenerationModal />
				<AccountContent />
			</PageLayout.Body>
		</PageLayout.Root>
	);
};

export default AccountPage;
