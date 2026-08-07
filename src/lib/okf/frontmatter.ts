/**
 * frontmatter.ts — parse/serialize OKF concept markdown (YAML frontmatter + body).
 */

import matter from "gray-matter";
import type { OkfFrontmatter } from "@/lib/okf/types";

export function parseFrontmatter(raw: string): {
    frontmatter: OkfFrontmatter;
    body: string;
} {
    const { data, content } = matter(raw);
    return {
        frontmatter: data as OkfFrontmatter,
        body: content.trim(),
    };
}

export function serializeFrontmatter(frontmatter: OkfFrontmatter, body: string): string {
    return matter.stringify(body, frontmatter);
}
