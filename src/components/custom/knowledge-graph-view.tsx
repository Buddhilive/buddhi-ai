"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import cytoscape, { type Core, type NodeSingular } from "cytoscape";
import { useTheme } from "next-themes";
import Link from "next/link";
import { NetworkIcon, SearchIcon, XIcon } from "lucide-react";
import { getAllConcepts } from "@/lib/okf/store";
import { buildConceptGraph, type ConceptGraph, type GraphNodeData } from "@/lib/okf/graph";
import type { OkfConcept } from "@/lib/okf/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Streamdown } from "streamdown";

const PALETTE_VARS = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"] as const;
const PLACEHOLDER_TYPE = "(unresolved)";

let normalizeCtx: CanvasRenderingContext2D | null = null;

/**
 * Cytoscape draws to <canvas> and parses colors with its own regex parser —
 * it doesn't resolve CSS var()/oklch(). Round-tripping through a canvas
 * context normalizes any valid CSS color (including oklch()) to rgb()/rgba(),
 * which cytoscape's parser does understand.
 */
function normalizeColor(cssColor: string): string {
	if (!cssColor) return cssColor;
	if (!normalizeCtx) normalizeCtx = document.createElement("canvas").getContext("2d");
	if (!normalizeCtx) return cssColor;
	normalizeCtx.fillStyle = "#000";
	normalizeCtx.fillStyle = cssColor;
	return normalizeCtx.fillStyle;
}

function themeColor(varName: string): string {
	return normalizeColor(getComputedStyle(document.documentElement).getPropertyValue(varName).trim());
}
function buildTypeColors(types: string[]): Map<string, string> {
	const map = new Map<string, string>();
	types
		.filter((t) => t !== PLACEHOLDER_TYPE)
		.forEach((type, i) => {
			map.set(type, themeColor(PALETTE_VARS[i % PALETTE_VARS.length]));
		});
	return map;
}

export function KnowledgeGraphView() {
	const { resolvedTheme } = useTheme();
	const [concepts, setConcepts] = useState<OkfConcept[] | null>(null);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [activeTypes, setActiveTypes] = useState<Set<string> | null>(null);

	const containerRef = useRef<HTMLDivElement>(null);
	const cyRef = useRef<Core | null>(null);
	const colorsRef = useRef<Map<string, string>>(new Map());

	// Load concepts once on mount
	useEffect(() => {
		let cancelled = false;
		getAllConcepts().then((c) => {
			if (!cancelled) setConcepts(c);
		});
		return () => {
			cancelled = true;
		};
	}, []);

	const graph: ConceptGraph | null = useMemo(
		() => (concepts ? buildConceptGraph(concepts) : null),
		[concepts]
	);

	const allTypes = useMemo(
		() => [...new Set((graph?.nodes ?? []).map((n) => n.data.type).filter((t) => t !== PLACEHOLDER_TYPE))].sort(),
		[graph]
	);

	// Init cytoscape once elements are ready; destroy on unmount.
	useEffect(() => {
		if (!graph || !containerRef.current) return;

		colorsRef.current = buildTypeColors(allTypes);

		const cy = cytoscape({
			container: containerRef.current,
			elements: [...graph.nodes, ...graph.edges],
			style: [
				{
					selector: "node",
					style: {
						"background-color": (ele) =>
							colorsRef.current.get(ele.data("type")) ?? themeColor("--muted-foreground"),
						label: "data(label)",
						"font-size": 10,
						color: () => themeColor("--foreground"),
						"text-valign": "bottom",
						"text-margin-y": 4,
						width: 24,
						height: 24,
					},
				},
				{
					selector: "node[?placeholder]",
					style: {
						"background-opacity": 0.25,
						"border-width": 1,
						"border-style": "dashed",
						"border-color": () => themeColor("--muted-foreground"),
						width: 16,
						height: 16,
					},
				},
				{
					selector: "node:selected",
					style: { "border-width": 3, "border-color": () => themeColor("--primary") },
				},
				{
					selector: "edge",
					style: {
						width: 1.5,
						"line-color": () => themeColor("--border"),
						"target-arrow-color": () => themeColor("--border"),
						"target-arrow-shape": "triangle",
						"curve-style": "bezier",
					},
				},
				{ selector: ".faded", style: { opacity: 0.12 } },
			],
			layout: { name: "cose", animate: false, padding: 30 },
		});

		cy.on("tap", "node", (evt) => setSelectedId(evt.target.id()));
		cy.on("tap", (evt) => {
			if (evt.target === cy) setSelectedId(null);
		});

		cyRef.current = cy;

		// Sidebar collapse/expand resizes the container without a window resize event.
		const ro = new ResizeObserver(() => cy.resize());
		ro.observe(containerRef.current);

		return () => {
			ro.disconnect();
			cy.destroy();
			cyRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [graph]);

	// Recolor (without rebuilding) on theme change.
	useEffect(() => {
		if (!cyRef.current) return;
		colorsRef.current = buildTypeColors(allTypes);
		cyRef.current.style().update();
	}, [resolvedTheme, allTypes]);

	// Search + type-filter -> fade non-matching elements.
	useEffect(() => {
		const cy = cyRef.current;
		if (!cy) return;
		const q = search.trim().toLowerCase();
		cy.batch(() => {
			cy.nodes().forEach((n) => {
				const d = n.data() as GraphNodeData;
				const matchesType = !activeTypes || activeTypes.has(d.type);
				const matchesSearch =
					!q ||
					d.label.toLowerCase().includes(q) ||
					d.id.toLowerCase().includes(q);
				n.toggleClass("faded", !(matchesType && matchesSearch));
			});
			cy.edges().forEach((e) => {
				e.toggleClass("faded", e.source().hasClass("faded") || e.target().hasClass("faded"));
			});
		});
	}, [search, activeTypes]);

	const selectedNode = useMemo(() => {
		if (!selectedId || !graph) return null;
		const node = graph.nodes.find((n) => n.data.id === selectedId);
		if (!node) return null;
		const concept = concepts?.find((c) => c.id === selectedId);
		const citedBy = graph.backlinks.get(selectedId) ?? [];
		return { node: node.data, concept, citedBy };
	}, [selectedId, graph, concepts]);

	const isLoading = concepts === null;
	const isEmpty = concepts?.length === 0;

	return (
		<div className="flex h-[calc(100vh-11rem)] w-full gap-4 p-6">
			{/* Main canvas area */}
			<div className="flex flex-1 flex-col gap-4">
				{/* Toolbar */}
				<div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
					<div className="flex gap-2">
						<div className="relative flex-1">
							<SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder="Search concepts..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="pl-9"
							/>
						</div>
						{search && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setSearch("")}
								className="h-10 w-10 p-0"
							>
								<XIcon className="h-4 w-4" />
							</Button>
						)}
					</div>

					{/* Type filter chips */}
					{allTypes.length > 0 && (
						<div className="flex flex-wrap gap-2">
							<span className="text-sm text-muted-foreground">Filter by type:</span>
							{allTypes.map((type) => (
								<Badge
									key={type}
									variant={activeTypes?.has(type) ? "default" : "outline"}
									className="cursor-pointer"
									onClick={() => {
										setActiveTypes((prev) => {
											if (!prev) {
												const newSet = new Set(allTypes);
												newSet.delete(type);
												return newSet.size > 0 ? newSet : null;
											}
											const newSet = new Set(prev);
											if (newSet.has(type)) newSet.delete(type);
											else newSet.add(type);
											return newSet.size > 0 ? newSet : null;
										});
									}}
								>
									{type}
								</Badge>
							))}
						</div>
					)}
				</div>

				{/* Graph canvas or empty/loading state */}
				{isLoading ? (
					<div className="flex flex-1 flex-col gap-4 rounded-lg border border-border bg-card p-6">
						<Skeleton className="h-8 w-48" />
						<Skeleton className="flex-1" />
					</div>
				) : isEmpty ? (
					<div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-border bg-card">
						<div className="text-center">
							<NetworkIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
							<h3 className="mb-2 text-lg font-semibold">No concepts yet</h3>
							<p className="mb-4 text-sm text-muted-foreground">
								Upload documents to build your knowledge graph.
							</p>
							<Button asChild variant="default">
								<Link href="/documents">Go to Documents</Link>
							</Button>
						</div>
					</div>
				) : (
					<div
						ref={containerRef}
						className="flex-1 rounded-lg border border-border bg-card"
					/>
				)}
			</div>

			{/* Detail panel */}
			{!isEmpty && (
				<div className="w-80 flex flex-col gap-4">
					{selectedNode ? (
						<Card className="flex flex-col gap-4 overflow-hidden p-4">
							{/* Header */}
							<div className="space-y-2 pb-4 border-b">
								<h2 className="text-lg font-semibold break-words">{selectedNode.node.label}</h2>
								<div className="flex flex-wrap gap-2">
									<Badge variant="secondary">{selectedNode.node.type}</Badge>
									{selectedNode.node.tags.map((tag) => (
										<Badge key={tag} variant="outline" className="text-xs">
											{tag}
										</Badge>
									))}
								</div>
							</div>

							{/* Body or placeholder */}
							<ScrollArea className="flex-1">
								<div className="pr-4">
									{selectedNode.node.placeholder ? (
										<p className="text-sm text-muted-foreground italic">
											This concept hasn&apos;t been created yet.
										</p>
									) : selectedNode.concept ? (
										<div className="prose prose-sm dark:prose-invert max-w-none">
											<Streamdown>{selectedNode.concept.body}</Streamdown>
										</div>
									) : null}
								</div>
							</ScrollArea>

							{/* Cited by */}
							{selectedNode.citedBy.length > 0 && (
								<div className="space-y-2 border-t pt-4">
									<h4 className="text-sm font-semibold">Cited by</h4>
									<div className="space-y-1">
										{selectedNode.citedBy.map((citerId) => (
											<button
												key={citerId}
												onClick={() => {
													setSelectedId(citerId);
													cyRef.current?.getElementById(citerId).select();
												}}
												className="block w-full text-left text-sm text-primary hover:underline truncate"
											>
												{citerId}
											</button>
										))}
									</div>
								</div>
							)}
						</Card>
					) : (
						<Card className="flex items-center justify-center p-6">
							<p className="text-sm text-muted-foreground text-center">
								Click a node to view details.
							</p>
						</Card>
					)}
				</div>
			)}
		</div>
	);
}
