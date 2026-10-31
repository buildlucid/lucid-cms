import { type Component, Index, Show } from "solid-js";
import T from "@/translations";

interface AuthSkeletonProps {
	/** Form inputs to sketch. Use 0 for pages that only have a button. @default 1 */
	fields?: number;
	/** Extra login options to sketch under an "or" divider. @default 0 */
	options?: number;
}

/** A rough loading placeholder for auth pages: the logo, heading, form and any extra login options. */
const AuthSkeleton: Component<AuthSkeletonProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div class="w-full" role="status" aria-label={T()("common.loading")}>
			<span class="skeleton mx-auto mb-6 block size-8" />
			<span class="skeleton mx-auto mb-2 block h-6 w-44" />
			<span class="skeleton mx-auto block h-5 w-64 max-w-full" />
			<div class="my-10 flex flex-col gap-3">
				<Index each={Array.from({ length: props.fields ?? 1 })}>
					{() => <span class="skeleton block h-15.5 w-full" />}
				</Index>
				<span class="skeleton mt-5 block h-12 w-full" />
			</div>
			<Show when={(props.options ?? 0) > 0}>
				<div class="flex flex-col gap-4">
					<Index each={Array.from({ length: props.options ?? 0 })}>
						{() => <span class="skeleton block h-12 w-full" />}
					</Index>
				</div>
			</Show>
		</div>
	);
};

export default AuthSkeleton;
