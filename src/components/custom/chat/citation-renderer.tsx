"use client";

import React, { useMemo } from "react";
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
 * - When streaming finishes, parses [cite:N] markers in prose (ignoring code blocks)
 *   and renders AI Elements InlineCitation badges with rich hover popovers.
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

  // If streaming is active, no annotations exist, or text has no citations, render directly
  if (isAnimating || !annotations.length || !text.includes("[cite:")) {
    return <MessageResponse>{text}</MessageResponse>;
  }

  // Split text by code blocks (``` ... ```) so code contents are never touched
  const codeBlockRegex = /(```[\s\S]*?```)/g;
  const sections = text.split(codeBlockRegex);

  return (
    <div className="space-y-3">
      {sections.map((section, sectionIdx) => {
        if (!section) return null;

        // If this section is a fenced code block, render it intact via MessageResponse
        if (section.startsWith("```") && section.endsWith("```")) {
          return (
            <MessageResponse key={`code-${sectionIdx}`}>
              {section}
            </MessageResponse>
          );
        }

        // Split prose into paragraphs by double newlines
        const paragraphs = section.split(/\n{2,}/);

        return (
          <React.Fragment key={`sec-${sectionIdx}`}>
            {paragraphs.map((paragraph, pIdx) => {
              const trimmed = paragraph.trim();
              if (!trimmed) return null;

              // If paragraph doesn't have citation markers, render normally
              if (!paragraph.includes("[cite:")) {
                return (
                  <MessageResponse key={`p-${sectionIdx}-${pIdx}`}>
                    {paragraph}
                  </MessageResponse>
                );
              }

              // Split paragraph on [cite:N] markers
              const parts = paragraph.split(/(\[cite:\d+\])/g);

              return (
                <div
                  key={`p-${sectionIdx}-${pIdx}`}
                  className="leading-relaxed my-2"
                >
                  {parts.map((part, partIdx) => {
                    const citeMatch = part.match(/^\[cite:(\d+)\]$/);

                    if (citeMatch) {
                      const citeIndex = parseInt(citeMatch[1], 10);
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
                        <InlineCitation
                          key={`cite-${partIdx}`}
                          className="inline-flex items-center align-baseline mx-0.5"
                        >
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

                    // Prose segment before or after citation marker
                    if (!part) return null;

                    return (
                      <span
                        key={`text-${partIdx}`}
                        className="inline [&>*:first-child]:inline [&>*:last-child]:inline [&>p]:inline [&>p]:m-0"
                      >
                        <MessageResponse>{part}</MessageResponse>
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
}
