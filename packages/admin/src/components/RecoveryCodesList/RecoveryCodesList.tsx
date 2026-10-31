import {
	TbOutlineCheck,
	TbOutlineCopy,
	TbOutlineDownload,
} from "solid-icons/tb";
import { type Component, For, Show } from "solid-js";
import Button from "@/components/Button/Button";
import { createCopy } from "@/components/Copy/copyValue";
import T from "@/translations";

interface RecoveryCodesListProps {
	codes: string[];
}

/** New recovery codes, shown once, with buttons to copy or download them. */
const RecoveryCodesList: Component<RecoveryCodesListProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [copied, copy] = createCopy(() => props.codes.join("\n"));

	// ----------------------------------------
	// Functions
	const download = () => {
		const host = window.location.host;
		const file = new Blob(
			[
				`${T()("auth.two.factor.recovery.codes.file.title", { host })}\n\n${T()("auth.two.factor.recovery.codes.file.description")}\n\n${props.codes.join("\n")}\n`,
			],
			{ type: "text/plain" },
		);
		const url = URL.createObjectURL(file);
		const link = document.createElement("a");
		link.href = url;
		link.download = `${host}-recovery-codes.txt`;
		link.click();
		//* some browsers cancel the download if the URL goes before it starts
		window.setTimeout(() => URL.revokeObjectURL(url));
	};

	// ----------------------------------------
	// Render
	return (
		<div>
			<div class="relative rounded-lg border border-border bg-input px-5 py-4">
				<span
					class="pointer-events-none absolute inset-y-3 left-1/2 w-px -translate-x-1/2 bg-border"
					aria-hidden="true"
				/>
				<ol class="grid grid-cols-2 gap-x-6 gap-y-2.5">
					<For each={props.codes}>
						{(code) => (
							<li class="text-center font-mono text-sm tracking-wider text-title select-all">
								{code}
							</li>
						)}
					</For>
				</ol>
			</div>
			<div class="mt-3 grid grid-cols-2 gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => void copy()}
				>
					<Show
						when={copied()}
						fallback={<TbOutlineCopy class="mr-2 size-4" />}
					>
						<TbOutlineCheck class="mr-2 size-4" />
					</Show>
					{T()("common.copy")}
				</Button>
				<Button type="button" variant="outline" size="sm" onClick={download}>
					<TbOutlineDownload class="mr-2 size-4" />
					{T()("common.download")}
				</Button>
			</div>
		</div>
	);
};

export default RecoveryCodesList;
