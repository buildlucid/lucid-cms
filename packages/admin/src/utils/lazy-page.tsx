import {
	type Component,
	createContext,
	createRenderEffect,
	createSignal,
	type JSXElement,
	Show,
	useContext,
} from "solid-js";
import { Dynamic } from "solid-js/web";

/** What a page shows while its code loads. Shells provide it, such as an empty page frame. */
export const LazyPageFallback = createContext<() => JSXElement>();

/**
 * A route page whose code loads on first use, like `lazy`, but without a
 * Suspense boundary. A boundary above a page also hides it, dropping focus,
 * whenever a query it read refetches, so while loading this shows the nearest
 * `LazyPageFallback` instead. `preload` starts loading ahead, such as on
 * navigation intent.
 *
 * @example
 * ```tsx
 * const MediaRoute = lazyPage(() => import("@/containers/MediaPage/MediaPage"));
 *
 * <Route path="/media" preload={() => MediaRoute.preload()} component={MediaRoute} />
 * ```
 */
export const lazyPage = <Props extends object>(
	load: () => Promise<{ default: Component<Props> }>,
) => {
	const [page, setPage] = createSignal<Component<Props>>();
	const [failed, setFailed] = createSignal<unknown>();
	let loading: Promise<unknown> | undefined;

	const preload = () => {
		if (!loading) setFailed(undefined);
		loading ??= load().then(
			(module) => setPage(() => module.default),
			(error: unknown) => {
				//* the next visit tries again, such as after a deploy replaced the chunk
				loading = undefined;
				setFailed(error);
			},
		);
		return loading;
	};

	const LazyPage: Component<Props> = (props) => {
		// ----------------------------------------
		// State & Hooks
		const fallback = useContext(LazyPageFallback);

		// ----------------------------------------
		// Effects
		void preload();
		//* thrown as `lazy` would, so a failed load is not a silently empty page
		createRenderEffect(() => {
			const error = failed();
			if (error !== undefined) throw error;
		});

		// ----------------------------------------
		// Render
		return (
			<Show when={page()} fallback={fallback?.()}>
				{(loaded) => <Dynamic component={loaded()} {...props} />}
			</Show>
		);
	};

	return Object.assign(LazyPage, { preload });
};

export default lazyPage;
