import type { PaperMetadata, CitationFormat } from "@/types/research";

export function formatCitation(
  meta: PaperMetadata,
  format: CitationFormat
): string {
  const authorString =
    meta.authors.length > 0 ? meta.authors.join(", ") : "Unknown Author";
  const title = meta.title || "Untitled Paper";
  const year = meta.year || new Date().getFullYear().toString();
  const journal = meta.journal || "arXiv preprint";

  switch (format) {
    case "apa":
      return `${authorString} (${year}). ${title}. ${journal}.`;
    case "mla":
      return `${authorString}. "${title}." ${journal}, ${year}.`;
    case "bibtex": {
      const citeKey = (meta.authors[0] || "author")
        .toLowerCase()
        .replace(/[^\w]/g, "") + year;
      return `@article{${citeKey},
  author = {${authorString}},
  title = {${title}},
  journal = {${journal}},
  year = {${year}}
}`;
    }
    case "chicago":
      return `${authorString}. "${title}." ${journal} (${year}).`;
    case "ieee":
      return `[1] ${authorString}, "${title}," ${journal}, ${year}.`;
    default:
      return `${authorString} (${year}). ${title}.`;
  }
}
