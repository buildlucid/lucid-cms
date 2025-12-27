import type { Component } from "solid-js";
import { CollectionsList } from "@/components/Groups/Content";
import { Standard } from "@/components/Groups/Headers";
import { Wrapper } from "@/components/Groups/Layout";
import useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import T from "@/translations";

const CollectionsListRoute: Component = () => {
	// ----------------------------------
	// Hooks & State
	const searchParams = useSearchParamsLocation();

	// ----------------------------------
	// Render
	return (
		<Wrapper
			slots={{
				header: (
					<Standard
						copy={{
							title: T()("collection_route_title"),
							description: T()("collection_route_description"),
						}}
					/>
				),
			}}
		>
			<CollectionsList
				state={{
					searchParams: searchParams,
				}}
			/>
		</Wrapper>
	);
};

export default CollectionsListRoute;
