import classNames from "classnames";
import { FaSolidXmark } from "solid-icons/fa";
import {
	type Component,
	createSignal,
	type JSXElement,
	onCleanup,
	onMount,
} from "solid-js";
import Button from "@/components/Button/Button";
import type {
	ComparisonOption,
	UseDocumentComparison,
} from "@/hooks/useDocumentComparison/useDocumentComparison";
import T from "@/translations";
import ComparisonVersionSelect from "./ComparisonVersionSelect";

/**
 * The bar above both side-by-side columns. Each half picks its column's
 * version: editable versions on the left, anything on the right. It sticks
 * under the page builder header while scrolling and is where the comparison
 * closes.
 */
const DocumentComparisonBar: Component<{
	comparison: UseDocumentComparison;
	leftKey: string | undefined;
	onSelectLeft: (option: ComparisonOption) => void;
	/** Shown at the end of the left half, eg. the workflow stage. */
	leftEnd: JSXElement;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	let ref: HTMLDivElement | undefined;
	const [stuck, setStuck] = createSignal(false);

	// ----------------------------------------
	// Functions
	//* the bar normally sits at the top of its container, so any gap means it is stuck
	const updateStuck = () => {
		const container = ref?.parentElement;
		if (!ref || !container) return;

		setStuck(
			ref.getBoundingClientRect().top - container.getBoundingClientRect().top >
				2,
		);
	};

	// ----------------------------------------
	// Effects
	onMount(() => {
		updateStuck();
		document.addEventListener("scroll", updateStuck, {
			capture: true,
			passive: true,
		});
		window.addEventListener("resize", updateStuck);
		onCleanup(() => {
			document.removeEventListener("scroll", updateStuck, { capture: true });
			window.removeEventListener("resize", updateStuck);
		});
	});

	// ----------------------------------------
	// Render
	return (
		<div
			ref={ref}
			class={classNames(
				"sticky top-(--document-header-bar-height) z-20 flex h-(--comparison-bar-height) items-center border-b border-border bg-card",
				{
					"w-full rounded-t-xl": !stuck(),
					"-mx-px w-[calc(100%+2px)] rounded-b-xl border-x": stuck(),
				},
			)}
		>
			<div class="flex h-full w-1/2 min-w-0 items-center justify-between gap-3 ps-2.5 pe-4 md:ps-4.5 md:pe-6">
				<ComparisonVersionSelect
					label={T()("documents.compare.left")}
					placeholder={T()("documents.compare.select")}
					options={props.comparison
						.options()
						.filter((option) => option.editable)}
					value={props.leftKey}
					otherValue={props.comparison.selectedKey()}
					onSelect={props.onSelectLeft}
				/>
				<div class="flex shrink-0 items-center">{props.leftEnd}</div>
			</div>
			<div class="flex h-full w-1/2 min-w-0 items-center justify-between gap-3 border-s border-border ps-2.5 pe-4 md:ps-4.5 md:pe-6">
				<ComparisonVersionSelect
					label={T()("documents.compare.right")}
					placeholder={T()("documents.compare.select")}
					options={props.comparison.options()}
					value={props.comparison.selectedKey()}
					otherValue={props.leftKey}
					onSelect={(option) => props.comparison.select(option.key)}
				/>
				<div class="flex shrink-0 items-center gap-2">
					<span class="text-xs text-muted">
						{T()("documents.compare.read.only")}
					</span>
					<Button
						variant="danger-ghost"
						size="xs"
						shape="square"
						aria-label={T()("documents.compare.close")}
						title={T()("documents.compare.close")}
						onClick={() => props.comparison.close()}
					>
						<FaSolidXmark size={12} />
					</Button>
				</div>
			</div>
		</div>
	);
};

export default DocumentComparisonBar;
