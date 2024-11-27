import T from "@/translations";
import { type Component, For } from "solid-js";
import type useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import api from "@/services/api";
import Layout from "@/components/Groups/Layout";
import Grid from "@/components/Groups/Grid";
import CollectionCard, {
	CollectionCardLoading,
} from "@/components/Cards/CollectionCard";

export const CollectionsList: Component<{
	state: {
		searchParams: ReturnType<typeof useSearchParamsLocation>;
	};
}> = (props) => {
	// ----------------------------------
	// Queries
	const collections = api.collections.useGetAll({
		queryParams: {
			queryString: props.state.searchParams.getQueryString,
		},
		enabled: () => props.state.searchParams.getSettled(),
	});

	// ----------------------------------------
	// Render
	return (
		<Layout.DynamicContent
			state={{
				isError: collections.isError,
				isSuccess: collections.isSuccess,
				isEmpty: collections.data?.data.length === 0,
				searchParams: props.state.searchParams,
			}}
			copy={{
				noEntries: {
					title: T()("no_collections"),
					description: T()("no_collections_description"),
				},
			}}
			options={{
				padding: "30",
			}}
		>
			<Grid.Root
				state={{
					isLoading: collections.isLoading,
					totalItems: collections.data?.data.length || 0,
					searchParams: props.state.searchParams,
				}}
				slots={{
					loadingCard: <CollectionCardLoading />,
				}}
			>
				<For each={collections.data?.data}>
					{(item) => CollectionCard({ collection: item })}
				</For>
			</Grid.Root>
		</Layout.DynamicContent>
	);
};
