"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import cytoscape, { type Core, type NodeSingular } from "cytoscape";
import { useTheme } from "next-themes";
import Link from "next/link";
import { NetworkIcon, SearchIcon, XIcon, ZoomInIcon, ZoomOutIcon, Maximize2Icon, RotateCcwIcon } from "lucide-react";
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

const GRAPH_PALETTE_VARS = ["--graph-1", "--graph-2", "--graph-3", "--graph-4", "--graph-5", "--graph-6", "--graph-7", "--graph-8", "--graph-9", "--graph-10", "--graph-11", "--graph-12"] as const;
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
interface TypeColor {
	fill: string;
	border: string;
}

function buildTypeColors(types: string[]): Map<string, TypeColor> {
	const map = new Map<string, TypeColor>();
	types
		.filter((t) => t !== PLACEHOLDER_TYPE)
		.forEach((type, i) => {
			let fillRgb: string;
			if (i < GRAPH_PALETTE_VARS.length) {
				fillRgb = themeColor(GRAPH_PALETTE_VARS[i]);
			} else {
				// Golden-angle hue stepping for overflow types (>12)
				const baseHue = 36.44; // primary hue
				const hueStep = 137.508; // golden angle
				const hue = (baseHue + (i - GRAPH_PALETTE_VARS.length) * hueStep) % 360;
				const oklchColor = `oklch(0.7 0.08 ${hue})`;
				fillRgb = normalizeColor(oklchColor);
			}
			
			// Derive border color by darkening RGB channels
			const match = fillRgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
			let borderRgb = fillRgb;
			if (match) {
				const r = Math.max(0, Math.floor(parseInt(match[1]) * 0.85));
				const g = Math.max(0, Math.floor(parseInt(match[2]) * 0.85));
				const b = Math.max(0, Math.floor(parseInt(match[3]) * 0.85));
				borderRgb = `rgb(${r},${g},${b})`;
			}
			
			map.set(type, { fill: fillRgb, border: borderRgb });
		});
	return map;
}

export function KnowledgeGraphView() {
	const { resolvedTheme } = useTheme();
	const [concepts, setConcepts] = useState<OkfConcept[] | null>(null);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
	const [hoveredNodePos, setHoveredNodePos] = useState<{ x: number; y: number } | null>(null);
	const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
	const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
	const [showLegend, setShowLegend] = useState(false);
	const [search, setSearch] = useState("");
	const [activeTypes, setActiveTypes] = useState<Set<string> | null>(null);

	const containerRef = useRef<HTMLDivElement>(null);
	const cyRef = useRef<Core | null>(null);
	const colorsRef = useRef<Map<string, TypeColor>>(new Map());

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
						"background-color": (ele) => {
							const color = colorsRef.current.get(ele.data("type"));
							return color?.fill ?? themeColor("--muted-foreground");
						},
						label: "data(label)",
						"font-size": 10,
						"min-zoomed-font-size": 8,
						"text-max-width": "80px",
						"text-wrap": "ellipsis",
						color: () => themeColor("--foreground"),
						"text-valign": "bottom",
						"text-margin-y": 4,
						width: 30,
						height: 30,
						"border-width": (ele) => {
							const color = colorsRef.current.get(ele.data("type"));
							return color && ele.selected() ? 3 : 2;
						},
						"border-color": (ele) => {
							const color = colorsRef.current.get(ele.data("type"));
							return color?.border ?? themeColor("--muted-foreground");
						},
					},
				},
				{
					selector: "node[?placeholder]",
					style: {
						"background-opacity": 0.25,
						"border-width": 2,
						"border-style": "dashed",
						"border-color": () => themeColor("--muted-foreground"),
						width: 20,
						height: 20,
					},
				},
				{
					selector: "node:selected",
					style: { "border-width": 3, "border-color": () => themeColor("--primary") },
				},
				{
					selector: 'edge[kind="containment"]',
					style: {
						width: 1,
						"line-style": "dashed",
						"line-color": () => themeColor("--muted-foreground"),
						"target-arrow-color": () => themeColor("--muted-foreground"),
						"target-arrow-shape": "triangle",
						"curve-style": "bezier",
					},
				},
				{
					selector: 'edge[kind="relatesTo"]',
					style: {
						width: 2,
						"line-color": () => themeColor("--primary"),
						"target-arrow-color": () => themeColor("--primary"),
						"target-arrow-shape": "triangle",
						"curve-style": "bezier",
					},
				},
				{
					selector: 'edge[kind="reference"]',
					style: {
						width: 1.5,
						"line-color": () => themeColor("--border"),
						"target-arrow-color": () => themeColor("--border"),
						"target-arrow-shape": "triangle",
						"curve-style": "bezier",
					},
				},
				{ selector: ".faded-filter", style: { opacity: 0.12 } },
				{ selector: ".faded-focus", style: { opacity: 0.12 } },
			],
						layout: {
				name: "cose",
				animate: true,
				animationDuration: 500,
				padding: 30,
				nodeRepulsion: 8000,
				idealEdgeLength: 100,
				nodeOverlap: 20,
				componentSpacing: 100,
				avoidOverlap: true,
				randomize: false,
				stop: () => {
					if (cy) cy.fit(undefined, 40);
				},
			},
		});

		cy.on("tap", "node", (evt) => {
			setSelectedId(evt.target.id());
			setSelectedEdgeId(null);
		});
		cy.on("tap", (evt) => {
			if (evt.target === cy) {
				setSelectedId(null);
				setSelectedEdgeId(null);
				setFocusedNodeId(null);
				cy.batch(() => cy.elements().removeClass("faded-focus"));
			}
		});

		// Hover tooltip
		cy.on("mouseover", "node", (evt) => {
			const node = evt.target;
			const pos = node.renderedPosition();
			if (containerRef.current) {
				const rect = containerRef.current.getBoundingClientRect();
				setHoveredNodeId(node.id());
				setHoveredNodePos({ x: pos.x + rect.left, y: pos.y + rect.top });
			}
		});

		cy.on("mouseout", "node", () => {
			setHoveredNodeId(null);
			setHoveredNodePos(null);
		});

		// Edge click
		cy.on("tap", "edge", (evt) => {
			setSelectedEdgeId(evt.target.id());
		});

		// Double-click focus on node
		let lastTapTime = 0;
		cy.on("tap", "node", (evt) => {
			const now = Date.now();
			if (now - lastTapTime < 300) {
				const node = evt.target;
				const neighborhood = node.closedNeighborhood();
				cy.batch(() => {
					cy.elements().difference(neighborhood).addClass("faded-focus");
					cy.animate({ fit: { eles: neighborhood, padding: 60 } }, { duration: 400 });
				});
				setFocusedNodeId(node.id());
			}
			lastTapTime = now;
		});

		// Drag affordance
		cy.on("grab", "node", () => {
			if (containerRef.current) containerRef.current.style.cursor = "grabbing";
		});
		cy.on("free", "node", () => {
			if (containerRef.current) containerRef.current.style.cursor = "grab";
		});

		// Clear hover on pan/zoom
		cy.on("pan zoom", () => {
			setHoveredNodeId(null);
			setHoveredNodePos(null);
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
				n.toggleClass("faded-filter", !(matchesType && matchesSearch));
			});
			cy.edges().forEach((e) => {
				e.toggleClass("faded-filter", e.source().hasClass("faded") || e.target().hasClass("faded"));
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
					<div className="relative flex-1">
						<div
							ref={containerRef}
							className="absolute inset-0 rounded-lg border border-border bg-card"
						/>

						{/* Zoom/reset controls */}
						<div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
							<Button
								size="sm"
								variant="outline"
								onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.2)}
								title="Zoom in"
							>
								<ZoomInIcon className="h-4 w-4" />
							</Button>
							<Button
								size="sm"
								variant="outline"
								onClick={() => cyRef.current?.zoom(cyRef.current.zoom() / 1.2)}
								title="Zoom out"
							>
								<ZoomOutIcon className="h-4 w-4" />
							</Button>
							<Button
								size="sm"
								variant="outline"
								onClick={() => {
									cyRef.current?.fit(undefined, 40);
									setFocusedNodeId(null);
									cyRef.current?.batch(() => cyRef.current?.elements().removeClass("faded-focus"));
								}}
								title="Fit to view"
							>
								<Maximize2Icon className="h-4 w-4" />
							</Button>
							{focusedNodeId && (
								<Button
									size="sm"
									variant="outline"
									onClick={() => {
										setFocusedNodeId(null);
										cyRef.current?.batch(() => cyRef.current?.elements().removeClass("faded-focus"));
										cyRef.current?.fit(undefined, 40);
									}}
									title="Reset focus"
								>
									<RotateCcwIcon className="h-4 w-4" />
								</Button>
							)}
						</div>

						{/* Legend */}
						{allTypes.length > 0 && (
							<div className="absolute left-4 top-4 z-10">
								<Button
									size="sm"
									variant="outline"
									onClick={() => setShowLegend(!showLegend)}
									className="mb-2"
								>
									Legend
								</Button>
								{showLegend && (
									<Card className="w-48 p-3">
										<div className="space-y-2">
											{allTypes.map((type) => {
												const color = colorsRef.current.get(type);
												return (
													<div key={type} className="flex items-center gap-2 text-sm">
														<div
															className="h-3 w-3 rounded border"
															style={{ backgroundColor: color?.fill, borderColor: color?.border }}
														/>
														<span className="truncate">{type}</span>
													</div>
												);
											})}
											<div className="border-t pt-2 mt-2 space-y-1 text-xs text-muted-foreground">
												<div className="flex items-center gap-2">
													<div className="h-0.5 w-3 bg-primary" />
													<span>Relates to</span>
												</div>
												<div className="flex items-center gap-2">
													<div className="h-0.5 w-3 border-t-2 border-dashed border-muted-foreground" />
													<span>Containment</span>
												</div>
											</div>
										</div>
									</Card>
								)}
							</div>
						)}

						{/* Hover tooltip */}
						{hoveredNodeId && hoveredNodePos && (
							<div
								className="absolute z-20 pointer-events-none"
								style={{ left: hoveredNodePos.x + 10, top: hoveredNodePos.y + 10 }}
							>
								<Card className="w-64 p-3 shadow-lg">
									<div className="space-y-2">
										<div className="font-medium truncate">{hoveredNodeId}</div>
										{(() => {
											const node = graph?.nodes.find((n) => n.data.id === hoveredNodeId);
											const concept = concepts?.find((c) => c.id === hoveredNodeId);
											return (
												<>
													{node && (
														<div className="flex flex-wrap gap-1">
															<Badge variant="secondary" className="text-xs">{node.data.type}</Badge>
															{node.data.tags.slice(0, 3).map((tag) => (
																<Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
															))}
														</div>
													)}
													{concept?.frontmatter.description && (
														<p className="text-xs text-muted-foreground line-clamp-2">
															{concept.frontmatter.description}
														</p>
													)}
												</>
											);
										})()}
									</div>
								</Card>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Detail panel */}
			{!isEmpty && (
				<div className="w-80 flex flex-col gap-4">
					{selectedEdgeId ? (
						<Card className="flex flex-col gap-4 overflow-hidden p-4">
							<div className="space-y-2">
								<h2 className="text-lg font-semibold">Edge Details</h2>
								{(() => {
									const edge = graph?.edges.find((e) => e.data.id === selectedEdgeId);
									if (!edge) return null;
									const edgeData = edge.data;
									return (
										<div className="space-y-3">
											<div>
												<p className="text-xs text-muted-foreground mb-1">From</p>
												<p className="text-sm font-medium truncate">{edgeData.source}</p>
											</div>
											<div>
												<p className="text-xs text-muted-foreground mb-1">To</p>
												<p className="text-sm font-medium truncate">{edgeData.target}</p>
											</div>
											<div>
												<p className="text-xs text-muted-foreground mb-1">Relationship</p>
												<Badge variant="secondary">{edgeData.kind}</Badge>
											</div>
											<Button
												size="sm"
												variant="outline"
												onClick={() => {
													setSelectedId(null);
													setSelectedEdgeId(null);
												}}
											>
												Close
											</Button>
										</div>
									);
								})()}
							</div>
						</Card>
					) : selectedNode ? (
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













