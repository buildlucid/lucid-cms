import { type Component, For, Show } from "solid-js";
import InfoRow from "@/components/Blocks/InfoRow";
import { DynamicContent } from "@/components/Groups/Layout";
import OAuthConnectionRow from "@/components/Partials/OAuthConnectionRow";
import api from "@/services/api";
import type { OAuthConnectionOwner } from "@/services/api/oauth-connections";
import T from "@/translations";

export const OAuthConnectionsList: Component<{
	owner: OAuthConnectionOwner;
	canUpdate: boolean;
	canRevoke: boolean;
	embedded?: boolean;
}> = (props) => {
	// ----------------------------------------
	// Queries
	const connections = api.oauthConnections.useGetConnections({
		queryParams: { owner: props.owner },
	});

	// ----------------------------------------
	// Functions
	const content = () => (
		<DynamicContent
			state={{
				isLoading: connections.isLoading,
				isError: connections.isError,
				isSuccess: connections.isSuccess,
				isEmpty: connections.isSuccess && connections.data.data.length === 0,
			}}
			copy={{
				noEntries: {
					title: T()("oauth.connections.empty.title"),
					description: T()("oauth.connections.empty.description"),
				},
			}}
			options={{ inline: true }}
		>
			<div class="flex flex-col">
				<For each={connections.data?.data ?? []}>
					{(connection) => (
						<OAuthConnectionRow
							connection={connection}
							owner={props.owner}
							canUpdate={props.canUpdate}
							canRevoke={props.canRevoke}
						/>
					)}
				</For>
			</div>
		</DynamicContent>
	);

	// ----------------------------------------
	// Render
	return (
		<Show
			when={props.embedded}
			fallback={
				<InfoRow.Root
					title={T()("oauth.connections.manage.title")}
					description={T()("oauth.connections.manage.description")}
				>
					{content()}
				</InfoRow.Root>
			}
		>
			{content()}
		</Show>
	);
};
