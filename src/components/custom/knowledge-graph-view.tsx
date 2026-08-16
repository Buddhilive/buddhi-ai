"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import cytoscape, { type Core, type StylesheetStyle, type StylesheetCSS } from "cytoscape";
import { useTheme } from "next-themes";
import Link from "next/link";
import {
	NetworkIcon,
	SearchIcon,
	XIcon,
	ZoomInIcon,
	ZoomOutIcon,
	Maximize2Icon,
	RotateCcwIcon,
	SparklesIcon,
	FileTextIcon,
	Link2Icon,
	InfoIcon,
	FolderTreeIcon,
} from "lucide-react";
import { getAllConcepts, putConcept } from "@/lib/okf/store";
import { buildConceptGraph, type ConceptGraph, type GraphNodeData } from "@/lib/okf/graph";
import type { OkfConcept } from "@/lib/okf/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Streamdown } from "streamdown";

// Palette of curated hues (avoiding purple/violet per design guidelines)
const GRAPH_PALETTE_HUES = [
	"oklch(0.68 0.16 38)",   // Warm Amber / Coral
	"oklch(0.65 0.14 150)",  // Emerald / Forest Green
	"oklch(0.64 0.13 210)",  // Ocean Cyan
	"oklch(0.62 0.15 240)",  // Deep Sky Blue
	"oklch(0.70 0.15 75)",   // Golden Ochre
	"oklch(0.60 0.14 185)",  // Teal
	"oklch(0.66 0.16 28)",   // Terracotta Orange
	"oklch(0.68 0.12 120)",  // Sage Olive
	"oklch(0.58 0.14 225)",  // Cobalt Blue
	"oklch(0.72 0.14 55)",   // Warm Sand / Peach
	"oklch(0.64 0.15 165)",  // Mint Green
	"oklch(0.60 0.12 195)",  // Steel Cerulean
] as const;

const PLACEHOLDER_TYPE = "(unresolved)";

let _canvasCtx: CanvasRenderingContext2D | null = null;
let _dummyEl: HTMLDivElement | null = null;

function parseOklch(str: string): string | null {
	const m = str.match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([-\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/i);
	if (!m) return null;

	let l = parseFloat(m[1]);
	if (m[2] === "%") l = l / 100;
	const c = parseFloat(m[3]);
	const h = parseFloat(m[4]);
	const alpha = m[5] !== undefined ? parseFloat(m[5]) : 1;

	const hRad = (h * Math.PI) / 180;
	const a = c * Math.cos(hRad);
	const b = c * Math.sin(hRad);

	const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
	const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
	const s_ = l - 0.0894841775 * a - 1.291485548 * b;

	const l3 = l_ * l_ * l_;
	const m3 = m_ * m_ * m_;
	const s3 = s_ * s_ * s_;

	const rLinear = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
	const gLinear = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
	const bLinear = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

	const gamma = (val: number) =>
		val > 0.0031308 ? 1.055 * Math.pow(Math.max(0, val), 1 / 2.4) - 0.055 : 12.92 * Math.max(0, val);

	const r = Math.max(0, Math.min(255, Math.round(gamma(rLinear) * 255)));
	const g = Math.max(0, Math.min(255, Math.round(gamma(gLinear) * 255)));
	const bVal = Math.max(0, Math.min(255, Math.round(gamma(bLinear) * 255)));

	return alpha < 1
		? `rgba(${r}, ${g}, ${bVal}, ${alpha.toFixed(2)})`
		: `rgb(${r}, ${g}, ${bVal})`;
}

function parseColorSrgb(str: string): string | null {
	const m = str.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/i);
	if (!m) return null;
	const r = Math.max(0, Math.min(255, Math.round(parseFloat(m[1]) * 255)));
	const g = Math.max(0, Math.min(255, Math.round(parseFloat(m[2]) * 255)));
	const b = Math.max(0, Math.min(255, Math.round(parseFloat(m[3]) * 255)));
	const alpha = m[4] !== undefined ? parseFloat(m[4]) : 1;
	return alpha < 1 ? `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})` : `rgb(${r}, ${g}, ${b})`;
}

/**
 * Resolves any CSS variable, OKLCH, sRGB, or color expression to standard rgb()/rgba().
 */
function resolveColor(cssValueOrVar: string, fallback = "rgb(180, 180, 180)"): string {
	if (!cssValueOrVar) return fallback;
	if (typeof window === "undefined" || typeof document === "undefined") return fallback;

	const trimmed = cssValueOrVar.trim();

	// Direct rgb/rgba match
	if (/^rgba?\(\s*\d+/i.test(trimmed)) return trimmed;

	// Direct OKLCH match
	if (trimmed.startsWith("oklch(")) {
		const parsed = parseOklch(trimmed);
		if (parsed) return parsed;
	}

	// DOM / Computed style lookup
	if (!_dummyEl || !_dummyEl.isConnected) {
		_dummyEl = document.createElement("div");
		_dummyEl.style.position = "absolute";
		_dummyEl.style.visibility = "hidden";
		_dummyEl.style.pointerEvents = "none";
		document.body.appendChild(_dummyEl);
	}

	const styleVal = trimmed.startsWith("--") ? `var(${trimmed})` : trimmed;
	_dummyEl.style.color = "";
	_dummyEl.style.color = styleVal;

	const computed = getComputedStyle(_dummyEl).color;
	if (computed) {
		if (/^rgba?\(\s*\d+/i.test(computed)) return computed;
		const oklchRes = parseOklch(computed);
		if (oklchRes) return oklchRes;
		const srgbRes = parseColorSrgb(computed);
		if (srgbRes) return srgbRes;
	}

	// Canvas 2D fallback
	if (!_canvasCtx) {
		const canvas = document.createElement("canvas");
		canvas.width = 1;
		canvas.height = 1;
		_canvasCtx = canvas.getContext("2d", { willReadFrequently: true });
	}

	if (_canvasCtx) {
		try {
			_canvasCtx.clearRect(0, 0, 1, 1);
			_canvasCtx.fillStyle = "transparent";
			_canvasCtx.fillStyle = computed || styleVal;
			if (_canvasCtx.fillStyle !== "transparent") {
				_canvasCtx.fillRect(0, 0, 1, 1);
				const [r, g, b, a] = _canvasCtx.getImageData(0, 0, 1, 1).data;
				if (a > 0) {
					return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(2)})`;
				}
			}
		} catch {
			// Canvas color parsing fallback
		}
	}

	return fallback;
}

interface TypeColor {
	fill: string;
	border: string;
	badgeBg: string;
}

function buildTypeColors(types: string[]): Map<string, TypeColor> {
	const map = new Map<string, TypeColor>();
	const filteredTypes = types.filter((t) => t !== PLACEHOLDER_TYPE);

	filteredTypes.forEach((type, i) => {
		const paletteColor = GRAPH_PALETTE_HUES[i % GRAPH_PALETTE_HUES.length];
		const fillRgb = resolveColor(paletteColor, "rgb(60, 130, 200)");

		const match = fillRgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
		let borderRgb = fillRgb;
		let badgeBg = fillRgb;

		if (match) {
			const r = parseInt(match[1]);
			const g = parseInt(match[2]);
			const b = parseInt(match[3]);
			const borderR = Math.max(0, Math.floor(r * 0.8));
			const borderG = Math.max(0, Math.floor(g * 0.8));
			const borderB = Math.max(0, Math.floor(b * 0.8));
			borderRgb = `rgb(${borderR}, ${borderG}, ${borderB})`;
			badgeBg = `rgba(${r}, ${g}, ${b}, 0.18)`;
		}

		map.set(type, { fill: fillRgb, border: borderRgb, badgeBg });
	});

	return map;
}

/**
 * Builds the complete, comprehensive Cytoscape stylesheet preserving all sizing,
 * labels, arrow heads, and interaction states.
 */
function buildGraphStylesheet(
	allTypes: string[],
	typeColors: Map<string, TypeColor>,
	isDark: boolean
): (StylesheetStyle | StylesheetCSS)[] {
	const fgColor = resolveColor("--foreground", isDark ? "rgb(235, 235, 235)" : "rgb(30, 30, 30)");
	const mutedFgColor = resolveColor("--muted-foreground", isDark ? "rgb(150, 150, 160)" : "rgb(110, 110, 120)");
	const primaryColor = resolveColor("--primary", "rgb(220, 95, 45)");
	const borderColor = resolveColor("--border", isDark ? "rgb(65, 70, 85)" : "rgb(220, 225, 230)");
	const cardBgColor = resolveColor("--card", isDark ? "rgb(25, 30, 42)" : "rgb(255, 255, 255)");

	const styles: (StylesheetStyle | StylesheetCSS)[] = [
		// Base node style
		{
			selector: "node",
			style: {
				label: "data(label)",
				color: fgColor,
				"font-size": 11,
				"font-family": 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
				"font-weight": "normal",
				"text-max-width": "110px",
				"text-wrap": "ellipsis",
				"text-valign": "bottom",
				"text-margin-y": 6,
				"text-background-opacity": 0.7,
				"text-background-color": cardBgColor,
				"text-background-padding": "2px",
				"text-background-shape": "roundrectangle",
				width: 36,
				height: 36,
				"background-color": mutedFgColor,
				"border-width": 2.5,
				"border-color": borderColor,
				"transition-property": "background-color, border-color, width, height, opacity, border-width",
				"transition-duration": 180,
			},
		},
		// Placeholder nodes (unresolved links)
		{
			selector: "node[?placeholder]",
			style: {
				"background-opacity": 0.25,
				"background-color": mutedFgColor,
				"border-width": 2,
				"border-style": "dashed",
				"border-color": mutedFgColor,
				color: mutedFgColor,
				width: 26,
				height: 26,
				"font-size": 10,
			},
		},
		// Selected node highlight
		{
			selector: "node:selected",
			style: {
				"border-width": 4,
				"border-color": primaryColor,
				width: 44,
				height: 44,
				"font-weight": "bold",
				"font-size": 12,
				"text-background-opacity": 0.9,
				"z-index": 999,
			},
		},
		// Base edge style
		{
			selector: "edge",
			style: {
				width: 1.5,
				"curve-style": "bezier",
				"line-color": borderColor,
				"target-arrow-color": borderColor,
				"target-arrow-shape": "triangle",
				"arrow-scale": 1.1,
				"transition-property": "line-color, target-arrow-color, width, opacity",
				"transition-duration": 180,
			},
		},
		// Containment edge (Part of, Concepts list)
		{
			selector: 'edge[kind="containment"]',
			style: {
				width: 1.8,
				"line-style": "dashed",
				"line-dash-pattern": [6, 4],
				"line-color": mutedFgColor,
				"target-arrow-color": mutedFgColor,
				"target-arrow-shape": "triangle",
				"curve-style": "bezier",
			},
		},
		// RelatesTo edge (See also)
		{
			selector: 'edge[kind="relatesTo"]',
			style: {
				width: 2.2,
				"line-style": "solid",
				"line-color": primaryColor,
				"target-arrow-color": primaryColor,
				"target-arrow-shape": "triangle",
				"curve-style": "bezier",
			},
		},
		// Reference edge
		{
			selector: 'edge[kind="reference"]',
			style: {
				width: 1.5,
				"line-style": "solid",
				"line-color": borderColor,
				"target-arrow-color": borderColor,
				"target-arrow-shape": "triangle",
				"curve-style": "bezier",
			},
		},
		// Selected edge
		{
			selector: "edge:selected",
			style: {
				width: 3.5,
				"line-color": primaryColor,
				"target-arrow-color": primaryColor,
				"z-index": 998,
			},
		},
		// Faded states for filtering and focus
		{
			selector: ".faded-filter",
			style: {
				opacity: 0.12,
			},
		},
		{
			selector: ".faded-focus",
			style: {
				opacity: 0.12,
			},
		},
	];

	// Append per-type color styles
	allTypes.forEach((type) => {
		const color = typeColors.get(type);
		if (color) {
			styles.push({
				selector: `node[type = "${type}"]`,
				style: {
					"background-color": color.fill,
					"border-color": color.border,
				},
			});
		}
	});

	return styles;
}

const SAMPLE_CONCEPTS: OkfConcept[] = [
	{
		id: "artificial-intelligence",
		frontmatter: {
			title: "Artificial Intelligence",
			type: "Field",
			tags: ["AI", "Core"],
			description: "Encompasses systems capable of learning, reasoning, and problem-solving.",
			generated: { by: "buddhi-ai/sample", at: new Date().toISOString() },
		},
		body: "Artificial Intelligence (AI) encompasses systems capable of learning, reasoning, and problem-solving.\n\n# Concepts\n\n- [Machine Learning](/machine-learning.md)\n- [Knowledge Representation](/knowledge-representation.md)",
		raw: "",
		fileName: "artificial-intelligence.md",
		fileSize: 200,
		createdAt: new Date().toISOString(),
	},
	{
		id: "machine-learning",
		frontmatter: {
			title: "Machine Learning",
			type: "Subfield",
			tags: ["ML", "Algorithms"],
			description: "Algorithms that build mathematical models based on sample data to make predictions.",
			generated: { by: "buddhi-ai/sample", at: new Date().toISOString() },
		},
		body: "Machine Learning algorithms build mathematical models based on sample data to make predictions.\n\nPart of [Artificial Intelligence](/artificial-intelligence.md).\n\nSee also: [Deep Learning](/deep-learning.md).",
		raw: "",
		fileName: "machine-learning.md",
		fileSize: 180,
		createdAt: new Date().toISOString(),
	},
	{
		id: "deep-learning",
		frontmatter: {
			title: "Deep Learning",
			type: "Architecture",
			tags: ["Neural Networks", "DL"],
			description: "Utilizes multi-layered artificial neural networks to extract high-level features.",
			generated: { by: "buddhi-ai/sample", at: new Date().toISOString() },
		},
		body: "Deep Learning utilizes artificial neural networks with multiple layers to extract higher-level features.\n\nPart of [Machine Learning](/machine-learning.md).\n\nSee also: [Transformer Architecture](/transformer-architecture.md).",
		raw: "",
		fileName: "deep-learning.md",
		fileSize: 210,
		createdAt: new Date().toISOString(),
	},
	{
		id: "transformer-architecture",
		frontmatter: {
			title: "Transformer Architecture",
			type: "Model",
			tags: ["LLM", "Attention"],
			description: "Relies entirely on self-attention mechanisms to compute representations without RNNs.",
			generated: { by: "buddhi-ai/sample", at: new Date().toISOString() },
		},
		body: "Transformers rely entirely on self-attention mechanisms to compute representations of input and output without using sequence-aligned RNNs.\n\nPart of [Deep Learning](/deep-learning.md).",
		raw: "",
		fileName: "transformer-architecture.md",
		fileSize: 220,
		createdAt: new Date().toISOString(),
	},
	{
		id: "knowledge-representation",
		frontmatter: {
			title: "Knowledge Representation",
			type: "Subfield",
			tags: ["Semantics", "Logic"],
			description: "Models information in a form that automated systems can utilize for reasoning.",
			generated: { by: "buddhi-ai/sample", at: new Date().toISOString() },
		},
		body: "Knowledge Representation models information about the world in a form that a computer system can utilize to solve complex tasks.\n\nPart of [Artificial Intelligence](/artificial-intelligence.md).\n\nSee also: [Knowledge Graph](/knowledge-graph.md).",
		raw: "",
		fileName: "knowledge-representation.md",
		fileSize: 230,
		createdAt: new Date().toISOString(),
	},
	{
		id: "knowledge-graph",
		frontmatter: {
			title: "Knowledge Graph",
			type: "Data Structure",
			tags: ["Graph", "Ontology"],
			description: "Stores interconnected descriptions of entities, objects, and relationships.",
			generated: { by: "buddhi-ai/sample", at: new Date().toISOString() },
		},
		body: "Knowledge Graphs store interconnected descriptions of entities – objects, events, situations, or abstract concepts.\n\nPart of [Knowledge Representation](/knowledge-representation.md).",
		raw: "",
		fileName: "knowledge-graph.md",
		fileSize: 240,
		createdAt: new Date().toISOString(),
	},
];

export function KnowledgeGraphView() {
	const { resolvedTheme } = useTheme();
	const isDark = resolvedTheme === "dark";

	const [concepts, setConcepts] = useState<OkfConcept[] | null>(null);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
	const [hoveredNodePos, setHoveredNodePos] = useState<{ x: number; y: number } | null>(null);
	const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
	const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
	const [showLegend, setShowLegend] = useState(false);
	const [search, setSearch] = useState("");
	const [activeTypes, setActiveTypes] = useState<Set<string> | null>(null);
	const [isSeeding, setIsSeeding] = useState(false);

	const containerRef = useRef<HTMLDivElement>(null);
	const cyRef = useRef<Core | null>(null);
	const colorsRef = useRef<Map<string, TypeColor>>(new Map());

	// Load concepts on mount and on window focus
	const loadConcepts = useCallback(() => {
		getAllConcepts().then((c) => {
			setConcepts(c);
		});
	}, []);

	useEffect(() => {
		loadConcepts();
		window.addEventListener("focus", loadConcepts);
		return () => {
			window.removeEventListener("focus", loadConcepts);
		};
	}, [loadConcepts]);

	const handleLoadSample = async () => {
		setIsSeeding(true);
		try {
			for (const c of SAMPLE_CONCEPTS) {
				await putConcept(c);
			}
			const loaded = await getAllConcepts();
			setConcepts(loaded);
		} finally {
			setIsSeeding(false);
		}
	};

	const graph: ConceptGraph | null = useMemo(
		() => (concepts ? buildConceptGraph(concepts) : null),
		[concepts]
	);

	const allTypes = useMemo(
		() =>
			[...new Set((graph?.nodes ?? []).map((n) => n.data.type).filter((t) => t !== PLACEHOLDER_TYPE))].sort(),
		[graph]
	);

	// Type counts for badges
	const typeCounts = useMemo(() => {
		const counts = new Map<string, number>();
		(graph?.nodes ?? []).forEach((n) => {
			if (n.data.type !== PLACEHOLDER_TYPE) {
				counts.set(n.data.type, (counts.get(n.data.type) ?? 0) + 1);
			}
		});
		return counts;
	}, [graph]);

	// Initialize Cytoscape instance when graph data or container is available
	useEffect(() => {
		if (!graph || !containerRef.current || graph.nodes.length === 0) {
			return;
		}

		// Rebuild colors map
		colorsRef.current = buildTypeColors(allTypes);
		const stylesheet = buildGraphStylesheet(allTypes, colorsRef.current, isDark);

		// Destroy previous instance if any
		if (cyRef.current && !cyRef.current.destroyed()) {
			cyRef.current.destroy();
			cyRef.current = null;
		}

		const cy = cytoscape({
			container: containerRef.current,
			elements: [...graph.nodes, ...graph.edges],
			minZoom: 0.15,
			maxZoom: 3.5,
			boxSelectionEnabled: false,
			style: stylesheet,
			layout: { name: "null" },
		});

		const layout = cy.layout({
			name: "cose",
			animate: true,
			animationDuration: 400,
			fit: true,
			padding: 50,
			randomize: true, // Crucial: avoids initial 0,0 collision
			nodeRepulsion: () => 8500,
			idealEdgeLength: () => 95,
			edgeElasticity: () => 32,
			nodeOverlap: 20,
			gravity: 0.9,
			numIter: 1000,
			initialTemp: 1000,
			coolingFactor: 0.99,
			minTemp: 1.0,
			componentSpacing: 60,
		});
		layout.run();

		// Node tap -> selection
		cy.on("tap", "node", (evt) => {
			const node = evt.target;
			setSelectedId(node.id());
			setSelectedEdgeId(null);
		});

		// Edge tap -> edge details
		cy.on("tap", "edge", (evt) => {
			const edge = evt.target;
			setSelectedEdgeId(edge.id());
			setSelectedId(null);
		});

		// Background tap -> clear selection & focus
		cy.on("tap", (evt) => {
			if (evt.target === cy) {
				setSelectedId(null);
				setSelectedEdgeId(null);
				setFocusedNodeId(null);
				cy.batch(() => {
					cy.elements().removeClass("faded-focus");
				});
			}
		});

		// Double-click/tap on node -> isolate neighborhood
		let lastTapTime = 0;
		cy.on("tap", "node", (evt) => {
			const now = Date.now();
			if (now - lastTapTime < 320) {
				const node = evt.target;
				const neighborhood = node.closedNeighborhood();
				cy.batch(() => {
					cy.elements().difference(neighborhood).addClass("faded-focus");
					cy.elements().filter(".faded-focus").unselect();
					node.select();
				});
				cy.animate({ fit: { eles: neighborhood, padding: 80 } }, { duration: 400 });
				setFocusedNodeId(node.id());
			}
			lastTapTime = now;
		});

		// Hover tooltip (rendered relative to container)
		cy.on("mouseover", "node", (evt) => {
			const node = evt.target;
			const pos = node.renderedPosition();
			setHoveredNodeId(node.id());
			setHoveredNodePos({ x: pos.x, y: pos.y });
		});

		cy.on("mouseout", "node", () => {
			setHoveredNodeId(null);
			setHoveredNodePos(null);
		});

		cy.on("pan zoom", () => {
			setHoveredNodeId(null);
			setHoveredNodePos(null);
		});

		// Grab cursor affordance
		cy.on("grab", "node", () => {
			if (containerRef.current) containerRef.current.style.cursor = "grabbing";
		});
		cy.on("free", "node", () => {
			if (containerRef.current) containerRef.current.style.cursor = "grab";
		});

		// Ensure layout fit on completion and container resize
		cy.one("layoutstop", () => {
			if (!cy.destroyed()) {
				cy.fit(undefined, 50);
			}
		});

		const fitGraph = () => {
			if (!cy || cy.destroyed()) return;
			cy.resize();
			cy.fit(undefined, 50);
		};

		const ro = new ResizeObserver(() => fitGraph());
		if (containerRef.current) {
			ro.observe(containerRef.current);
		}

		cyRef.current = cy;

		return () => {
			ro.disconnect();
			layout.stop();
			if (!cy.destroyed()) {
				cy.destroy();
			}
			cyRef.current = null;
		};
	}, [graph, allTypes, isDark]);

	// Update stylesheet when theme or types change without wiping base rules
	useEffect(() => {
		const cy = cyRef.current;
		if (!cy || cy.destroyed()) return;

		colorsRef.current = buildTypeColors(allTypes);
		const newStylesheet = buildGraphStylesheet(allTypes, colorsRef.current, isDark);
		cy.style(newStylesheet).update();
	}, [isDark, allTypes]);

	// Search & type filter synchronization
	useEffect(() => {
		const cy = cyRef.current;
		if (!cy || cy.destroyed()) return;

		const q = search.trim().toLowerCase();

		cy.batch(() => {
			cy.nodes().forEach((n) => {
				const d = n.data() as GraphNodeData;
				const matchesType = !activeTypes || activeTypes.has(d.type);
				const matchesSearch =
					!q ||
					d.label.toLowerCase().includes(q) ||
					d.id.toLowerCase().includes(q) ||
					(d.tags && d.tags.some((t) => t.toLowerCase().includes(q)));

				n.toggleClass("faded-filter", !(matchesType && matchesSearch));
			});

			cy.edges().forEach((e) => {
				const sourceFaded = e.source().hasClass("faded-filter");
				const targetFaded = e.target().hasClass("faded-filter");
				e.toggleClass("faded-filter", sourceFaded || targetFaded);
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
		<div className="flex h-[calc(100vh-8rem)] w-full gap-4 p-4 lg:p-6 overflow-hidden">
			{/* Main canvas column */}
			<div className="flex flex-1 flex-col gap-3 min-w-0 min-h-0">
				{/* Toolbar */}
				<div className="flex flex-col gap-3 rounded-xl border border-border bg-card/90 backdrop-blur-sm p-3.5 shadow-xs shrink-0">
					<div className="flex items-center gap-2">
						<div className="relative flex-1">
							<SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder="Search concepts by title, ID, or tag..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="pl-9 h-9 bg-background/80"
							/>
						</div>
						{search && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setSearch("")}
								className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
								title="Clear search"
							>
								<XIcon className="h-4 w-4" />
							</Button>
						)}
					</div>

					{/* Type filter chips */}
					{allTypes.length > 0 && (
						<div className="flex flex-wrap items-center gap-1.5">
							<span className="text-xs font-medium text-muted-foreground mr-1">Filter by type:</span>
							{allTypes.map((type) => {
								const isSelected = activeTypes?.has(type) ?? false;
								const typeColor = colorsRef.current.get(type);
								const count = typeCounts.get(type) ?? 0;

								return (
									<Badge
										key={type}
										variant="outline"
										className="cursor-pointer select-none transition-all py-0.5 px-2 text-xs flex items-center gap-1.5 hover:border-primary/60"
										style={{
											backgroundColor: isSelected ? typeColor?.badgeBg ?? "var(--accent)" : "transparent",
											borderColor: isSelected ? typeColor?.fill ?? "var(--primary)" : undefined,
										}}
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
										<span
											className="h-2 w-2 rounded-full shrink-0"
											style={{ backgroundColor: typeColor?.fill ?? "var(--muted-foreground)" }}
										/>
										<span>{type}</span>
										<span className="text-[10px] text-muted-foreground">({count})</span>
									</Badge>
								);
							})}
							{activeTypes && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setActiveTypes(null)}
									className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
								>
									Reset filter
								</Button>
							)}
						</div>
					)}
				</div>

				{/* Graph canvas or empty/loading state */}
				{isLoading ? (
					<div className="flex flex-1 flex-col gap-4 rounded-xl border border-border bg-card p-6 min-h-0">
						<div className="flex items-center gap-3">
							<Skeleton className="h-8 w-48" />
							<Skeleton className="h-8 w-24" />
						</div>
						<Skeleton className="flex-1 w-full rounded-lg" />
					</div>
				) : isEmpty ? (
					<div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-border bg-card/50 p-8 min-h-0">
						<div className="text-center max-w-md px-4">
							<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
								<NetworkIcon className="h-7 w-7" />
							</div>
							<h3 className="mb-2 text-lg font-semibold tracking-tight">No concepts in knowledge base</h3>
							<p className="mb-6 text-sm text-muted-foreground">
								Upload documents to parse linked OKF concepts, or seed sample concepts to explore the knowledge graph visualization.
							</p>
							<div className="flex flex-col sm:flex-row gap-3 justify-center">
								<Button onClick={handleLoadSample} disabled={isSeeding} variant="default" className="gap-2 shadow-sm">
									<SparklesIcon className="h-4 w-4" />
									{isSeeding ? "Loading Sample Base..." : "Load Sample Base"}
								</Button>
								<Button asChild variant="outline">
									<Link href="/documents" className="gap-2">
										<FileTextIcon className="h-4 w-4" />
										Go to Documents
									</Link>
								</Button>
							</div>
						</div>
					</div>
				) : (
					<div className="relative flex-1 min-h-0 rounded-xl border border-border bg-card/60 overflow-hidden shadow-inner">
						{/* Cytoscape container div */}
						<div
							ref={containerRef}
							className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
						/>

						{/* Top-Right zoom & layout controls */}
						<div className="absolute right-4 top-4 z-10 flex flex-col gap-1.5 bg-card/90 backdrop-blur-md p-1.5 rounded-lg border border-border shadow-md">
							<Button
								size="sm"
								variant="ghost"
								onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.25)}
								className="h-8 w-8 p-0"
								title="Zoom in"
							>
								<ZoomInIcon className="h-4 w-4" />
							</Button>
							<Button
								size="sm"
								variant="ghost"
								onClick={() => cyRef.current?.zoom(cyRef.current.zoom() / 1.25)}
								className="h-8 w-8 p-0"
								title="Zoom out"
							>
								<ZoomOutIcon className="h-4 w-4" />
							</Button>
							<Button
								size="sm"
								variant="ghost"
								onClick={() => {
									cyRef.current?.fit(undefined, 50);
									setFocusedNodeId(null);
									cyRef.current?.batch(() => cyRef.current?.elements().removeClass("faded-focus"));
								}}
								className="h-8 w-8 p-0"
								title="Fit to view"
							>
								<Maximize2Icon className="h-4 w-4" />
							</Button>
							{focusedNodeId && (
								<Button
									size="sm"
									variant="ghost"
									onClick={() => {
										setFocusedNodeId(null);
										cyRef.current?.batch(() => cyRef.current?.elements().removeClass("faded-focus"));
										cyRef.current?.fit(undefined, 50);
									}}
									className="h-8 w-8 p-0 text-primary"
									title="Reset focus"
								>
									<RotateCcwIcon className="h-4 w-4" />
								</Button>
							)}
						</div>

						{/* Top-Left Legend toggle & popover */}
						{allTypes.length > 0 && (
							<div className="absolute left-4 top-4 z-10">
								<Button
									size="sm"
									variant="outline"
									onClick={() => setShowLegend(!showLegend)}
									className="bg-card/90 backdrop-blur-md shadow-sm gap-2 h-8 text-xs font-medium"
								>
									<FolderTreeIcon className="h-3.5 w-3.5" />
									Legend
								</Button>

								{showLegend && (
									<Card className="w-56 p-3 mt-2 shadow-xl border-border bg-card/95 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
										<div className="space-y-2.5">
											<div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
												Concept Types
											</div>
											<div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
												{allTypes.map((type) => {
													const color = colorsRef.current.get(type);
													const count = typeCounts.get(type) ?? 0;
													return (
														<div key={type} className="flex items-center justify-between text-xs">
															<div className="flex items-center gap-2 min-w-0">
																<div
																	className="h-3 w-3 rounded-full shrink-0 border"
																	style={{
																		backgroundColor: color?.fill,
																		borderColor: color?.border,
																	}}
																/>
																<span className="truncate font-medium">{type}</span>
															</div>
															<span className="text-muted-foreground text-[11px] shrink-0">
																{count}
															</span>
														</div>
													);
												})}
											</div>

											<div className="border-t border-border pt-2 space-y-1.5 text-xs text-muted-foreground">
												<div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
													Relationships
												</div>
												<div className="flex items-center gap-2">
													<div className="h-0.5 w-4 bg-primary rounded-full" />
													<span>Relates to (solid)</span>
												</div>
												<div className="flex items-center gap-2">
													<div className="h-0.5 w-4 border-t-2 border-dashed border-muted-foreground" />
													<span>Containment (dashed)</span>
												</div>
												<div className="flex items-center gap-2">
													<div className="h-0.5 w-4 bg-border" />
													<span>Reference</span>
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
								className="absolute z-20 pointer-events-none transition-transform duration-75 ease-out"
								style={{
									left: `${hoveredNodePos.x + 14}px`,
									top: `${hoveredNodePos.y - 10}px`,
								}}
							>
								<Card className="w-64 p-3 shadow-xl border-border bg-card/95 backdrop-blur-md">
									<div className="space-y-1.5">
										<div className="font-semibold text-sm truncate">{hoveredNodeId}</div>
										{(() => {
											const node = graph?.nodes.find((n) => n.data.id === hoveredNodeId);
											const concept = concepts?.find((c) => c.id === hoveredNodeId);
											return (
												<>
													{node && (
														<div className="flex flex-wrap gap-1">
															<Badge variant="secondary" className="text-[10px] py-0 px-1.5">
																{node.data.type}
															</Badge>
															{node.data.tags.slice(0, 3).map((tag) => (
																<Badge key={tag} variant="outline" className="text-[10px] py-0 px-1.5">
																	{tag}
																</Badge>
															))}
														</div>
													)}
													{concept?.frontmatter.description && (
														<p className="text-xs text-muted-foreground line-clamp-2 mt-1">
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

			{/* Detail panel on the right */}
			{!isEmpty && (
				<div className="w-80 lg:w-96 flex flex-col h-full overflow-hidden">
					{selectedEdgeId ? (
						<Card className="flex flex-col h-full overflow-hidden p-5 border-border bg-card/90 shadow-sm">
							<div className="flex items-center justify-between pb-3 border-b border-border">
								<div className="flex items-center gap-2">
									<Link2Icon className="h-4 w-4 text-primary" />
									<h2 className="text-base font-semibold">Relationship Details</h2>
								</div>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => {
										setSelectedEdgeId(null);
										cyRef.current?.edges().unselect();
									}}
									className="h-7 w-7 p-0"
								>
									<XIcon className="h-4 w-4" />
								</Button>
							</div>

							{(() => {
								const edge = graph?.edges.find((e) => e.data.id === selectedEdgeId);
								if (!edge) return null;
								const edgeData = edge.data;
								return (
									<div className="space-y-4 pt-4">
										<div>
											<p className="text-xs text-muted-foreground mb-1 font-medium">Source Concept</p>
											<Button
												variant="outline"
												className="w-full justify-start text-xs font-mono truncate h-8"
												onClick={() => {
													setSelectedEdgeId(null);
													setSelectedId(edgeData.source);
													cyRef.current?.nodes().unselect();
													cyRef.current?.getElementById(edgeData.source).select();
												}}
											>
												{edgeData.source}
											</Button>
										</div>
										<div>
											<p className="text-xs text-muted-foreground mb-1 font-medium">Target Concept</p>
											<Button
												variant="outline"
												className="w-full justify-start text-xs font-mono truncate h-8"
												onClick={() => {
													setSelectedEdgeId(null);
													setSelectedId(edgeData.target);
													cyRef.current?.nodes().unselect();
													cyRef.current?.getElementById(edgeData.target).select();
												}}
											>
												{edgeData.target}
											</Button>
										</div>
										<div>
											<p className="text-xs text-muted-foreground mb-1 font-medium">Relationship Kind</p>
											<Badge
												variant={edgeData.kind === "relatesTo" ? "default" : "secondary"}
												className="capitalize"
											>
												{edgeData.kind}
											</Badge>
										</div>
									</div>
								);
							})()}
						</Card>
					) : selectedNode ? (
						<Card className="flex flex-col h-full overflow-hidden p-5 border-border bg-card/90 shadow-sm">
							{/* Node Header */}
							<div className="space-y-2 pb-4 mb-3 border-b border-border">
								<div className="flex items-start justify-between gap-2">
									<h2 className="text-lg font-bold tracking-tight break-words">
										{selectedNode.node.label}
									</h2>
									<Button
										size="sm"
										variant="ghost"
										onClick={() => {
											setSelectedId(null);
											cyRef.current?.nodes().unselect();
										}}
										className="h-7 w-7 p-0 shrink-0"
									>
										<XIcon className="h-4 w-4" />
									</Button>
								</div>
								<div className="flex flex-wrap gap-1.5">
									<Badge
										variant="outline"
										style={{
											backgroundColor: colorsRef.current.get(selectedNode.node.type)?.badgeBg,
											borderColor: colorsRef.current.get(selectedNode.node.type)?.fill,
										}}
									>
										{selectedNode.node.type}
									</Badge>
									{selectedNode.node.tags.map((tag) => (
										<Badge key={tag} variant="secondary" className="text-xs">
											#{tag}
										</Badge>
									))}
								</div>
							</div>

							{/* Concept Body or Placeholder info */}
							<ScrollArea className="flex-1 min-h-0 pr-3">
								{selectedNode.node.placeholder ? (
									<div className="rounded-lg border border-dashed border-border p-4 text-center my-4">
										<InfoIcon className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
										<p className="text-xs text-muted-foreground">
											This is a referenced placeholder concept. It has not been directly authored or ingested yet.
										</p>
									</div>
								) : selectedNode.concept ? (
									<div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed space-y-2">
										<Streamdown>{selectedNode.concept.body}</Streamdown>
									</div>
								) : null}
							</ScrollArea>

							{/* Backlinks / Cited By */}
							{selectedNode.citedBy.length > 0 && (
								<div className="space-y-2 border-t border-border pt-3 shrink-0">
									<h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
										<Link2Icon className="h-3.5 w-3.5" />
										Cited by ({selectedNode.citedBy.length})
									</h4>
									<div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
										{selectedNode.citedBy.map((citerId) => (
											<Button
												key={citerId}
												variant="secondary"
												size="sm"
												onClick={() => {
													setSelectedId(citerId);
													cyRef.current?.nodes().unselect();
													const target = cyRef.current?.getElementById(citerId);
													target?.select();
													if (target && !target.empty()) {
														cyRef.current?.center(target);
													}
												}}
												className="h-6 text-xs px-2 truncate max-w-full font-mono hover:text-primary"
											>
												{citerId}
											</Button>
										))}
									</div>
								</div>
							)}
						</Card>
					) : (
						<Card className="flex flex-col items-center justify-center h-full p-6 text-center border-border bg-card/60">
							<NetworkIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
							<h3 className="text-sm font-medium text-foreground mb-1">No concept selected</h3>
							<p className="text-xs text-muted-foreground max-w-xs">
								Click any node in the graph to inspect its frontmatter, body markdown, tags, and citations. Double-click to isolate connected concepts.
							</p>
						</Card>
					)}
				</div>
			)}
		</div>
	);
}
