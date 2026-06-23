import type { Component } from "solid-js";
import { Account } from "@/components/Groups/Content";
import { Standard } from "@/components/Groups/Headers";
import { Wrapper } from "@/components/Groups/Layout";
import MediaAltGenerationModal from "@/components/Modals/AI/MediaAltGenerationModal";
import MediaImageGenerationModal from "@/components/Modals/AI/MediaImageGenerationModal";
import T from "@/translations";

const AccountRoute: Component = () => {
	// ----------------------------------------
	// Render
	return (
		<Wrapper
			slots={{
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
			<MediaImageGenerationModal />
			<Account />
		</Wrapper>
	);
};

export default AccountRoute;
