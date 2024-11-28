import T from "@/translations";
import type { Component } from "solid-js";
import useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import { Wrapper } from "@/components/Groups/Layout";
import { Standard } from "@/components/Groups/Headers";
import { CollectionsList } from "@/components/Groups/Content";

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
