import { TbOutlineX } from "solid-icons/tb";
import { type Component, createMemo, type JSXElement } from "solid-js";
import Button from "@/components/Button/Button";
import type {
	ComparisonOption,
	UseDocumentComparison,
} from "@/hooks/useDocumentComparison/useDocumentComparison";
import T from "@/translations";
import ComparisonVersionSelect from "./ComparisonVersionSelect";

/**
 * Sticky comparison controls. Selects editable versions on the left and any version on the right,
 * with a close action.
 */
const DocumentComparisonBar: Component<{
	comparison: UseDocumentComparison;
	leftKey: string | undefined;
	onSelectLeft: (option: ComparisonOption) => void;
	/** Shown at the end of the left half, eg. the workflow stage. */
	leftEnd: JSXElement;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const leftOptions = createMemo(() =>
		props.comparison.options().filter((option) => option.editable),
	);
	//* columns swap when each one's version can also open in the other
	const swappable = createMemo(
		() =>
			leftOptions().some(
				(option) => option.key === props.comparison.selectedKey(),
			) &&
			props.comparison.options().some((option) => option.key === props.leftKey),
	);

	// ----------------------------------------
	// Render
	return (
		<div class="flex h-(--comparison-bar-height) shrink-0 items-center border-b border-border bg-card">
			<div class="flex h-full w-1/2 min-w-0 items-center justify-between gap-3 ps-2.5 pe-4 md:ps-4.5 md:pe-6">
				<ComparisonVersionSelect
					label={T()("documents.compare.left")}
					placeholder={T()("documents.compare.select")}
					options={leftOptions()}
					value={props.leftKey}
					otherValue={props.comparison.selectedKey()}
					swappable={swappable()}
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
					swappable={swappable()}
					onSelect={(option) => {
						//* swapping from the right opens its version on the left
						const current = props.comparison.selected();
						if (option.key === props.leftKey && current) {
							props.onSelectLeft(current);
							return;
						}
						props.comparison.select(option.key);
					}}
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
						tooltip={T()("documents.compare.close")}
						onClick={() => props.comparison.close()}
					>
						<TbOutlineX size={12} />
					</Button>
				</div>
			</div>
		</div>
	);
};

export default DocumentComparisonBar;
