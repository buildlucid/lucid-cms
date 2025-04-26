import T from "@/translations";
import { useParams, useNavigate } from "@solidjs/router";
import { type Component, createSignal } from "solid-js";
import { useQueryClient } from "@tanstack/solid-query";
import { Breadcrumbs } from "@kobalte/core/breadcrumbs";
import ContentLocaleSelect from "@/components/Partials/ContentLocaleSelect";
import Button from "@/components/Partials/Button";

interface CollectionsDocumentsEditRouteProps {
	mode: "create" | "edit";
	version: "draft" | "published";
}

const CollectionsDocumentsEditRoute: Component<
	CollectionsDocumentsEditRouteProps
> = (props) => {
	// ----------------------------------
	// Hooks & State
	const params = useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	// ----------------------------------
	// Render
	return (
		<>
			<header class="bg-container-2 w-full -mt-15 pt-5 px-5 pb-0 border-x border-border">
				<Breadcrumbs>
					<ol class="flex gap-2.5">
						<li class="">
							<Breadcrumbs.Link href="/" class="text-sm">
								Home
							</Breadcrumbs.Link>
							<Breadcrumbs.Separator class="ml-2.5 text-sm" />
						</li>
						<li class="breadcrumbs__item">
							<Breadcrumbs.Link href="/components" class="text-sm">
								Components
							</Breadcrumbs.Link>
							<Breadcrumbs.Separator class="ml-2.5 text-sm" />
						</li>
						<li class="breadcrumbs__item">
							<Breadcrumbs.Link current class="text-sm">
								Breadcrumbs
							</Breadcrumbs.Link>
						</li>
					</ol>
				</Breadcrumbs>
				<h1 class="mt-2.5">Page - #1234</h1>

				<nav class="-mb-px bg-container-2 mt-15">
					<ul class="flex">
						<li class="relative">
							<button
								type="button"
								class="px-4 py-2 font-medium bg-container-3 rounded-t-xl relative z-10 border-border border-x border-t"
							>
								Edit
							</button>
							<span class="absolute bottom-0 -left-2 w-[9px] h-2 z-20 bg-container-3" />
							<span class="absolute bottom-0 -right-2 w-[9px] h-2 z-20 bg-container-3" />
							<span class="absolute bottom-[0.5px] -left-2 w-[9px] z-21 h-2 bg-container-2 rounded-br-xl border-b border-r border-border" />
							<span class="absolute bottom-[0.5px] -right-2 w-[9px] z-21 h-2 bg-container-2 rounded-bl-xl border-b border-l border-border" />
						</li>
						<li class="">
							<button
								type="button"
								class="px-4 py-2 hover:bg-container-2/50 rounded-t-lg transition-colors"
							>
								Revisions
							</button>
						</li>
						<li class="">
							<button
								type="button"
								class="px-4 py-2 hover:bg-container-2/50 rounded-t-lg transition-colors"
							>
								Preview
							</button>
						</li>
					</ul>
				</nav>
			</header>
			<div class="sticky top-0 w-full px-5 py-2.5 bg-container-3 border border-border rounded-b-xl flex items-center justify-between">
				<div class="flex items-center gap-2.5">
					<div>
						<span class="font-medium mr-1">{T()("status")}:</span>
						<span>draft</span>
					</div>
					<div>
						<span class="font-medium mr-1">{T()("created")}:</span>
						<span>10/02/1999</span>
					</div>
					<div>
						<span class="font-medium mr-1">{T()("modified")}:</span>
						<span>10/02/1999</span>
					</div>
				</div>
				<div class="flex items-center gap-2.5">
					<div class="w-52">
						<ContentLocaleSelect />
					</div>
					<Button
						type="button"
						theme="secondary"
						size="x-small"
						onClick={() => {}}
					>
						{T()("publish")}
					</Button>
					<Button
						type="button"
						theme="secondary"
						size="x-small"
						onClick={() => {}}
					>
						{T()("save_draft")}
					</Button>
				</div>
			</div>

			<div class="mt-15 bg-container-3 rounded-t-xl border border-border p-15">
				page builder Fugiat consequat magna magna amet sit anim minim. Quis
				pariatur cillum proident fugiat. Laborum elit Lorem consectetur qui
				magna exercitation nulla ex do do sit mollit non. Pariatur velit laborum
				ut veniam dolor sint cupidatat elit cupidatat. Enim anim consectetur
				ipsum veniam non. Cupidatat nisi cupidatat deserunt ea consectetur in
				ullamco mollit pariatur. Ea laboris cupidatat ut incididunt anim eiusmod
				ad sit minim culpa enim. Labore tempor occaecat ex anim aliqua commodo
				deserunt minim enim consectetur. Aliqua duis qui officia mollit quis
				dolore. Esse occaecat nisi minim sint sunt anim culpa irure ipsum et ea
				adipisicing proident duis. Nisi veniam nostrud ad consectetur minim
				magna magna elit nostrud aliqua consequat eiusmod aliquip et. Culpa
				exercitation ea in excepteur amet dolor ex sit sint velit incididunt
				excepteur. Nisi ullamco cillum elit esse velit officia esse. Incididunt
				sunt occaecat consequat pariatur aute ipsum. Eiusmod ipsum ullamco
				exercitation dolore in est eu reprehenderit culpa ut et culpa
				adipisicing do. Dolor eu exercitation ad et occaecat consectetur aliqua
				nisi. Magna Lorem sit aute magna nisi magna aliqua dolore. Cupidatat
				cillum labore ad proident sint quis aliquip laboris aute Lorem excepteur
				minim labore veniam. Aliquip labore consequat magna dolore ea tempor
				Lorem eu pariatur aliquip labore ullamco deserunt. Proident cillum
				mollit labore eiusmod ex fugiat minim mollit exercitation officia.
				Occaecat dolore eiusmod culpa magna quis voluptate nisi incididunt
				mollit exercitation aute fugiat eu. Ullamco sit labore fugiat proident
				ea irure nisi magna laborum. Adipisicing velit culpa magna tempor ipsum
				ea elit sit consectetur ea. Duis magna consequat officia laboris. Anim
				voluptate eiusmod dolore occaecat qui amet Lorem amet. In dolore qui
				tempor reprehenderit anim reprehenderit nostrud minim aute laborum est.
				Nostrud consectetur reprehenderit nisi esse cupidatat esse irure
				consequat Lorem. Id sit reprehenderit aute proident ea sint do laboris.
				Aliqua sit sit nisi et pariatur eu consectetur et dolore occaecat est.
				Aliquip sit duis eiusmod magna irure aute nulla elit sint eu dolor
				consectetur eiusmod minim. Incididunt sunt tempor enim aute nostrud anim
				amet eiusmod sit cupidatat est. Nisi culpa enim magna ut sunt ad mollit.
				Qui culpa sunt aute non velit magna aliqua reprehenderit adipisicing ex.
				Dolore officia qui incididunt duis ipsum fugiat ad velit deserunt
				nostrud. page builder Fugiat consequat magna magna amet sit anim minim.
				Quis pariatur cillum proident fugiat. Laborum elit Lorem consectetur qui
				magna exercitation nulla ex do do sit mollit non. Pariatur velit laborum
				ut veniam dolor sint cupidatat elit cupidatat. Enim anim consectetur
				ipsum veniam non. Cupidatat nisi cupidatat deserunt ea consectetur in
				ullamco mollit pariatur. Ea laboris cupidatat ut incididunt anim eiusmod
				ad sit minim culpa enim. Labore tempor occaecat ex anim aliqua commodo
				deserunt minim enim consectetur. Aliqua duis qui officia mollit quis
				dolore. Esse occaecat nisi minim sint sunt anim culpa irure ipsum et ea
				adipisicing proident duis. Nisi veniam nostrud ad consectetur minim
				magna magna elit nostrud aliqua consequat eiusmod aliquip et. Culpa
				exercitation ea in excepteur amet dolor ex sit sint velit incididunt
				excepteur. Nisi ullamco cillum elit esse velit officia esse. Incididunt
				sunt occaecat consequat pariatur aute ipsum. Eiusmod ipsum ullamco
				exercitation dolore in est eu reprehenderit culpa ut et culpa
				adipisicing do. Dolor eu exercitation ad et occaecat consectetur aliqua
				nisi. Magna Lorem sit aute magna nisi magna aliqua dolore. Cupidatat
				cillum labore ad proident sint quis aliquip laboris aute Lorem excepteur
				minim labore veniam. Aliquip labore consequat magna dolore ea tempor
				Lorem eu pariatur aliquip labore ullamco deserunt. Proident cillum
				mollit labore eiusmod ex fugiat minim mollit exercitation officia.
				Occaecat dolore eiusmod culpa magna quis voluptate nisi incididunt
				mollit exercitation aute fugiat eu. Ullamco sit labore fugiat proident
				ea irure nisi magna laborum. Adipisicing velit culpa magna tempor ipsum
				ea elit sit consectetur ea. Duis magna consequat officia laboris. Anim
				voluptate eiusmod dolore occaecat qui amet Lorem amet. In dolore qui
				tempor reprehenderit anim reprehenderit nostrud minim aute laborum est.
				Nostrud consectetur reprehenderit nisi esse cupidatat esse irure
				consequat Lorem. Id sit reprehenderit aute proident ea sint do laboris.
				Aliqua sit sit nisi et pariatur eu consectetur et dolore occaecat est.
				Aliquip sit duis eiusmod magna irure aute nulla elit sint eu dolor
				consectetur eiusmod minim. Incididunt sunt tempor enim aute nostrud anim
				amet eiusmod sit cupidatat est. Nisi culpa enim magna ut sunt ad mollit.
				Qui culpa sunt aute non velit magna aliqua reprehenderit adipisicing ex.
				Dolore officia qui incididunt duis ipsum fugiat ad velit deserunt
				nostrud.
			</div>
		</>
	);
};

export default CollectionsDocumentsEditRoute;
