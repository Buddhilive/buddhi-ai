/**
 * graph.ts — builds a Cytoscape-ready link graph from OKF concepts.
 *
 * Implements okf-guide.md §3 (bundle-relative/relative link resolution) and
 * §8.2 step 3 (record edges even when the target concept doesn't exist, so
 * "cited by" backlink views and dangling-link tolerance both work).
 */

import type { OkfConcept } from "@/lib/okf/types";

export interface GraphNodeData {
	id: string;
	label: string;
	type: string;
	tags: string[];
	/** true when this id is only known because something links to it — no concept exists yet. */
	placeholder: boolean;
}

export interface GraphEdgeData {
	id: string;
	source: string;
	target: string;
}

export interface ConceptGraph {
	nodes: { data: GraphNodeData }[];
	edges: { data: GraphEdgeData }[];
	/** target concept id -> ids of concepts that link to it ("cited by"). */
	backlinks: Map<string, string[]>;
}

// Matches [text](href) and ![text](href); group 1 captures the leading "!" (image), group 2 the href.
const LINK_RE = /(!?)\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function normalizeSegments(parts: string[]): string[] {
	const out: string[] = [];
	for (const part of parts) {
		if (part === "" || part === ".") continue;
		if (part === "..") {
			out.pop();
			continue;
		}
		out.push(part);
	}
	return out;
}

/**
 * Resolves a markdown link href against the id of the concept that contains it,
 * per okf-guide.md §3: bundle-relative ("/a/b.md") or path-relative ("./b.md",
 * "../b.md"). Returns null for external links (any URL scheme), anchors, and
 * anything not targeting a ".md" concept file.
 */
export function resolveConceptLink(fromId: string, href: string): string | null {
	const path = href.split(/[?#]/)[0];
	if (!path) return null;
	if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return null; // http:, mailto:, data:, etc.
	if (!path.toLowerCase().endsWith(".md")) return null;

	const stripped = path.slice(0, -3);

	if (stripped.startsWith("/")) {
		const resolved = normalizeSegments(stripped.split("/")).join("/");
		return resolved || null;
	}

	// Path-relative: resolve against the directory containing `fromId`.
	// (Today's bundle is flat per bundle.ts, so fromParts is always [] and this
	// degrades to a no-op join — but it's correct if ids ever gain "/" nesting.)
	const fromParts = fromId.split("/");
	fromParts.pop();
	const resolved = normalizeSegments([...fromParts, ...stripped.split("/")]).join("/");
	return resolved || null;
}

function extractLinkTargets(concept: OkfConcept): string[] {
	const targets = new Set<string>();
	for (const match of concept.body.matchAll(LINK_RE)) {
		if (match[1] === "!") continue; // skip image embeds
		const target = resolveConceptLink(concept.id, match[2]);
		if (target && target !== concept.id) targets.add(target);
	}
	return [...targets];
}

/** Builds Cytoscape elements + a backlink index from the full concept set. */
export function buildConceptGraph(concepts: OkfConcept[]): ConceptGraph {
	const existingIds = new Set(concepts.map((c) => c.id));
	const nodes = new Map<string, GraphNodeData>();
	const edges: { data: GraphEdgeData }[] = [];
	const backlinks = new Map<string, string[]>();
	const seenEdgeKeys = new Set<string>();

	for (const c of concepts) {
		nodes.set(c.id, {
			id: c.id,
			label: c.frontmatter.title || c.id,
			type: c.frontmatter.type || "Document",
			tags: c.frontmatter.tags ?? [],
			placeholder: false,
		});
	}

	for (const c of concepts) {
		for (const targetId of extractLinkTargets(c)) {
			const key = `${c.id}->${targetId}`;
			if (seenEdgeKeys.has(key)) continue;
			seenEdgeKeys.add(key);
			edges.push({ data: { id: key, source: c.id, target: targetId } });

			if (!existingIds.has(targetId) && !nodes.has(targetId)) {
				nodes.set(targetId, {
					id: targetId,
					label: targetId,
					type: "(unresolved)",
					tags: [],
					placeholder: true,
				});
			}

			const list = backlinks.get(targetId);
			if (list) list.push(c.id);
			else backlinks.set(targetId, [c.id]);
		}
	}

	return {
		nodes: [...nodes.values()].map((data) => ({ data })),
		edges,
		backlinks,
	};
}
