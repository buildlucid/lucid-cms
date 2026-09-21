import classnames from "classnames";
import { type Component, For, Show } from "solid-js";
import EmptyState from "@/components/EmptyState/EmptyState";
import InfoRow from "@/components/InfoRow/InfoRow";
import OAuthConnectionRow from "@/components/OAuthConnectionRow/OAuthConnectionRow";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import api from "@/services/api";
import type { OAuthConnectionOwner } from "@/services/api/oauth-connections";
import T from "@/translations";

export const OAuthConnectionsList: Component<{
	owner: OAuthConnectionOwner;
	canUpdate: boolean;
	canRevoke: boolean;
	embedded?: boolean;
	contained?: boolean;
}> = (props) => {
	// ----------------------------------------
	// Queries
	const connections = api.oauthConnections.useGetConnections({
		queryParams: { owner: props.owner },
	});

	// ----------------------------------------
	// Functions
	const content = () => (
		<QueryBoundary
			isLoading={connections.isLoading}
			isError={connections.isError}
			isEmpty={connections.isSuccess && connections.data.data.length === 0}
			empty={
				<EmptyState
					title={T()("oauth.connections.empty.title")}
					description={T()("oauth.connections.empty.description")}
				/>
			}
			class={classnames({
				"overflow-hidden rounded-md border border-border bg-card-base":
					props.contained !== false,
			})}
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
		</QueryBoundary>
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
