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
	kind: "containment" | "relatesTo" | "reference";
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

	let stripped = path;
	if (stripped.toLowerCase().endsWith(".md")) {
		stripped = stripped.slice(0, -3);
	} else if (stripped.toLowerCase().endsWith(".markdown")) {
		stripped = stripped.slice(0, -9);
	}

	if (stripped.startsWith("/")) {
		const resolved = normalizeSegments(stripped.split("/")).join("/");
		return resolved || null;
	}

	// Path-relative: resolve against the directory containing `fromId`.
	const fromParts = fromId.split("/");
	fromParts.pop();
	const resolved = normalizeSegments([...fromParts, ...stripped.split("/")]).join("/");
	return resolved || null;
}

interface LinkWithKind {
	target: string;
	kind: "containment" | "relatesTo" | "reference";
}

/**
 * Extracts link targets with their semantic kind (containment, relatesTo, or reference).
 * Kind detection is based on textual patterns from documents.ts::decomposeConceptIfPossible:
 *   - "Part of [...]" → containment
 *   - "See also: ..." → relatesTo
 *   - After "# Concepts" heading → containment
 *   - Otherwise → reference
 */
function extractLinkTargetsWithKind(concept: OkfConcept): LinkWithKind[] {
	const result: LinkWithKind[] = [];
	const seenTargets = new Set<string>();

	// Find the position of the "# Concepts" heading to detect root→sub links (tolerant to CRLF / # levels)
	const conceptsHeadingMatch = concept.body.match(/(?:^|\r?\n)#+\s*Concepts\b/i);
	const conceptsHeadingIdx = conceptsHeadingMatch ? (conceptsHeadingMatch.index ?? -1) : -1;

	for (const match of concept.body.matchAll(LINK_RE)) {
		if (match[1] === "!") continue; // skip image embeds
		const target = resolveConceptLink(concept.id, match[2]);
		if (!target || target === concept.id || seenTargets.has(target)) continue;
		seenTargets.add(target);

		let kind: "containment" | "relatesTo" | "reference" = "reference";

		// Check if preceded by "Part of "
		const beforeMatch = concept.body.slice(Math.max(0, (match.index ?? 0) - 60), match.index ?? 0);
		if (/Part\s+of\s*$/i.test(beforeMatch) || beforeMatch.includes("Part of ")) {
			kind = "containment";
		}
		// Check if inside "See also:" line
		else if (beforeMatch.includes("See also:")) {
			kind = "relatesTo";
		}
		// Check if after "# Concepts" heading
		else if (conceptsHeadingIdx !== -1 && (match.index ?? 0) > conceptsHeadingIdx) {
			kind = "containment";
		}

		result.push({ target, kind });
	}

	return result;
}

function extractLinkTargets(concept: OkfConcept): string[] {
	return extractLinkTargetsWithKind(concept).map(link => link.target);
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
		for (const link of extractLinkTargetsWithKind(c)) {
			const key = `${c.id}->${link.target}`;
			if (seenEdgeKeys.has(key)) continue;
			seenEdgeKeys.add(key);
			edges.push({ data: { id: key, source: c.id, target: link.target, kind: link.kind } });

			if (!existingIds.has(link.target) && !nodes.has(link.target)) {
				nodes.set(link.target, {
					id: link.target,
					label: link.target,
					type: "(unresolved)",
					tags: [],
					placeholder: true,
				});
			}

			const list = backlinks.get(link.target);
			if (list) list.push(c.id);
			else backlinks.set(link.target, [c.id]);
		}
	}

	return {
		nodes: [...nodes.values()].map((data) => ({ data })),
		edges,
		backlinks,
	};
}



