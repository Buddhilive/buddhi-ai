"use client";

import React, { useMemo, type ComponentProps } from "react";
import { MessageResponse } from "@/components/ai-elements/message";
import {
  InlineCitation,
  InlineCitationCard,
  InlineCitationCardBody,
  InlineCitationCardTrigger,
  InlineCitationQuote,
  InlineCitationSource,
} from "@/components/ai-elements/inline-citation";
import type { RagCitationAnnotation } from "@/types/research";

export interface CitationRendererProps {
  text: string;
  annotations?: RagCitationAnnotation[];
  isAnimating?: boolean;
}

/**
 * CitationRenderer
 *
 * Renders assistant messages with interactive inline citations.
 * - During active streaming (isAnimating=true), renders raw text via Streamdown
 *   to prevent partial token and splitting glitches.
 * - When streaming finishes, transforms [cite:N] tokens in prose into markdown links
 *   `[cite:N](#cite:N)` (leaving fenced code blocks untouched), and renders via
 *   Streamdown's `components.a` override.
 * - This ensures citations and trailing punctuation remain in the exact same sentence line
 *   without artificial line breaks or fragmented markdown blocks.
 */
export function CitationRenderer({
  text,
  annotations = [],
  isAnimating = false,
}: CitationRendererProps) {
  // Pre-index annotations by their zero-based index for O(1) lookup
  const annotationMap = useMemo(() => {
    const map = new Map<number, RagCitationAnnotation>();
    for (const ann of annotations) {
      map.set(ann.index, ann);
    }
    return map;
  }, [annotations]);

  // Transform text so [cite:N] outside code blocks becomes [cite:N](#cite:N)
  const processedText = useMemo(() => {
    if (!text.includes("[cite:")) return text;

    // Split text by code blocks (``` ... ```) so code contents are never touched
    const codeBlockRegex = /(```[\s\S]*?```)/g;
    const sections = text.split(codeBlockRegex);

    return sections
      .map((section) => {
        if (!section) return "";
        if (section.startsWith("```") && section.endsWith("```")) {
          return section;
        }
        // In prose, convert [cite:N] to [cite:N](#cite:N)
        return section.replace(/\[cite:(\d+)\]/g, "[cite:$1](#cite:$1)");
      })
      .join("");
  }, [text]);

  const components = useMemo(() => {
    return {
      a: ({ href, children, ...props }: ComponentProps<"a">) => {
        if (href?.startsWith("#cite:")) {
          const citeIndex = parseInt(href.slice(6), 10);
          const annotation = annotationMap.get(citeIndex);

          if (!annotation) {
            // Unknown or invalid citation index — suppress marker
            return null;
          }

          const pillLabel =
            annotation.paperTitle.length > 25
              ? `${annotation.paperTitle.slice(0, 22)}... p.${annotation.pageNumber}`
              : `${annotation.paperTitle} p.${annotation.pageNumber}`;

          const authorsLabel =
            annotation.authors && annotation.authors.length > 0
              ? annotation.authors.join(", ")
              : "Unknown Authors";

          const metadataDescription = `${authorsLabel}${
            annotation.year ? ` (${annotation.year})` : ""
          } • Page ${annotation.pageNumber}${
            annotation.sectionHeading
              ? ` • §${annotation.sectionHeading}`
              : ""
          }`;

          return (
            <InlineCitation className="inline-flex items-center align-baseline mx-0.5">
              <InlineCitationCard>
                <InlineCitationCardTrigger
                  sources={[pillLabel]}
                  className="text-[11px] font-normal py-0.5 px-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/50"
                />
                <InlineCitationCardBody className="p-3 bg-popover text-popover-foreground border shadow-md rounded-lg max-w-sm">
                  <InlineCitationSource
                    title={annotation.paperTitle}
                    description={metadataDescription}
                  />
                  {annotation.textSnippet ? (
                    <InlineCitationQuote className="mt-2 text-xs line-clamp-4">
                      &ldquo;{annotation.textSnippet}&rdquo;
                    </InlineCitationQuote>
                  ) : null}
                </InlineCitationCardBody>
              </InlineCitationCard>
            </InlineCitation>
          );
        }

        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
            {...props}
          >
            {children}
          </a>
        );
      },
    };
  }, [annotationMap]);

  // If streaming is active, no annotations exist, or text has no citations, render directly
  if (isAnimating || !annotations.length || !text.includes("[cite:")) {
    return <MessageResponse>{text}</MessageResponse>;
  }

  return (
    <MessageResponse components={components}>
      {processedText}
    </MessageResponse>
  );
}
