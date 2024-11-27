import T from "@/translations";
import type { Component } from "solid-js";
import useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import Layout from "@/components/Groups/Layout";
import Headers from "@/components/Groups/Headers";
import Content from "@/components/Groups/Content";

const CollectionsListRoute: Component = () => {
	// ----------------------------------
	// Hooks & State
	const searchParams = useSearchParamsLocation();

	// ----------------------------------
	// Render
	return (
		<Layout.Wrapper
			slots={{
				header: (
					<Headers.Standard
						copy={{
							title: T()("collection_route_title"),
							description: T()("collection_route_description"),
						}}
					/>
				),
			}}
		>
			<Content.CollectionsList
				state={{
					searchParams: searchParams,
				}}
			/>
		</Layout.Wrapper>
	);
};

export default CollectionsListRoute;
