"""
LaTeX Systematic Literature Review Generator

Generates LaTeX documents for systematic literature reviews using Gemini AI
to write content based on collected papers.
"""

import logging
import os
from typing import List, Dict, Optional
from datetime import datetime
import google.generativeai as genai

from app.core.config import settings
from app.services.bibtex_generator import BibTeXGenerator

logger = logging.getLogger(__name__)


class LaTeXReviewGenerator:
    """Generates systematic literature review documents in LaTeX."""

    def __init__(self):
        """Initialize the generator with Gemini API."""
        self.bibtex_gen = BibTeXGenerator()

        # Configure Gemini
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel('gemini-pro')
        else:
            logger.warning("GEMINI_API_KEY not configured, AI generation disabled")
            self.model = None

    def _generate_latex_header(self, title: str, author: str = "Anonymous") -> str:
        """Generate LaTeX document header."""
        return f"""\\documentclass[12pt,a4paper]{{article}}

% Packages
\\usepackage[utf8]{{inputenc}}
\\usepackage[T1]{{fontenc}}
\\usepackage{{geometry}}
\\usepackage{{cite}}
\\usepackage{{url}}
\\usepackage{{hyperref}}
\\usepackage{{graphicx}}
\\usepackage{{booktabs}}
\\usepackage{{longtable}}

% Page geometry
\\geometry{{
    a4paper,
    left=2.5cm,
    right=2.5cm,
    top=2.5cm,
    bottom=2.5cm
}}

% Hyperref setup
\\hypersetup{{
    colorlinks=true,
    linkcolor=blue,
    citecolor=blue,
    urlcolor=blue
}}

% Title information
\\title{{{title}}}
\\author{{{author}}}
\\date{{\\today}}

\\begin{{document}}

\\maketitle

\\begin{{abstract}}
This systematic literature review was automatically generated using LitRevTool.
The review analyzes papers collected from Google Scholar based on specific search criteria.
The PRISMA methodology was followed to ensure systematic and transparent reporting.
\\end{{abstract}}

\\tableofcontents
\\newpage
"""

    def _generate_introduction_section(self, search_criteria: Dict) -> str:
        """Generate introduction section with search methodology."""
        keywords_inc = ", ".join(search_criteria.get('keywords_include', []))
        keywords_exc = ", ".join(search_criteria.get('keywords_exclude', []))
        start_year = search_criteria.get('start_year', 'N/A')
        end_year = search_criteria.get('end_year', 'N/A')

        intro = f"""\\section{{Introduction}}

This systematic literature review examines the research literature based on the following search strategy:

\\subsection{{Search Criteria}}

\\begin{{itemize}}
    \\item \\textbf{{Inclusion Keywords}}: {keywords_inc}
"""

        if keywords_exc:
            intro += f"    \\item \\textbf{{Exclusion Keywords}}: {keywords_exc}\n"

        intro += f"""    \\item \\textbf{{Year Range}}: {start_year} to {end_year}
    \\item \\textbf{{Database}}: Google Scholar
\\end{{itemize}}

\\subsection{{Methodology}}

This review follows the PRISMA (Preferred Reporting Items for Systematic Reviews and Meta-Analyses) guidelines.
The search was conducted using LitRevTool, which overcomes Google Scholar's limitations by splitting searches by year.

"""
        return intro

    def _generate_prisma_section(self, prisma_metrics: Dict) -> str:
        """Generate PRISMA flow section with metrics table."""
        if not prisma_metrics:
            return ""

        identification = prisma_metrics.get('identification', {})
        screening = prisma_metrics.get('screening', {})
        eligibility = prisma_metrics.get('eligibility', {})
        included = prisma_metrics.get('included', {})

        return f"""\\section{{PRISMA Flow}}

The following table summarizes the systematic review process according to PRISMA guidelines:

\\begin{{table}}[h]
\\centering
\\begin{{tabular}}{{ll}}
\\toprule
\\textbf{{Stage}} & \\textbf{{Count}} \\\\
\\midrule
Records identified & {identification.get('records_identified', 0)} \\\\
Duplicates removed & {screening.get('records_excluded_duplicates', 0)} \\\\
Records screened & {screening.get('records_screened', 0)} \\\\
Papers assessed for eligibility & {eligibility.get('full_text_assessed', 0)} \\\\
Papers excluded (semantic criteria) & {eligibility.get('full_text_excluded_semantic', 0)} \\\\
\\midrule
\\textbf{{Studies included}} & \\textbf{{{included.get('studies_included', 0)}}} \\\\
\\bottomrule
\\end{{tabular}}
\\caption{{PRISMA flow summary}}
\\label{{tab:prisma}}
\\end{{table}}

"""

    def _generate_literature_review_with_ai(self, papers: List[Dict], search_criteria: Dict) -> str:
        """Use Gemini AI to generate literature review content."""
        if not self.model or not papers:
            return self._generate_basic_literature_review(papers)

        try:
            # Prepare paper summaries for AI
            paper_summaries = []
            for i, paper in enumerate(papers[:50]):  # Limit to first 50 for API constraints
                title = paper.get('title', 'Unknown')
                authors = paper.get('authors', 'Unknown')
                year = paper.get('year', 'N/A')
                abstract = paper.get('abstract', '')[:200]  # Truncate long abstracts

                paper_summaries.append(f"{i+1}. {title} ({authors}, {year})")
                if abstract:
                    paper_summaries.append(f"   Abstract: {abstract}...")

            papers_text = "\n".join(paper_summaries[:30])  # Further limit for prompt

            keywords = ", ".join(search_criteria.get('keywords_include', []))

            prompt = f"""Based on the following research papers about "{keywords}", write a comprehensive literature review section for an academic paper.

The review should:
1. Identify main themes and trends
2. Group related papers together
3. Highlight key findings and methodologies
4. Note any gaps or areas for future research
5. Be written in formal academic style
6. Be 400-600 words

Papers:
{papers_text}

Write the literature review section:"""

            response = self.model.generate_content(prompt)

            if response and response.text:
                return f"""\\section{{Literature Review}}

{response.text}

\\subsection{{Paper Distribution}}

A total of {len(papers)} papers were included in this review. The papers span various topics related to {keywords}.

"""
            else:
                return self._generate_basic_literature_review(papers)

        except Exception as e:
            logger.error(f"Error generating AI literature review: {e}")
            return self._generate_basic_literature_review(papers)

    def _generate_basic_literature_review(self, papers: List[Dict]) -> str:
        """Generate basic literature review without AI."""
        if not papers:
            return "\\section{Literature Review}\n\nNo papers were collected.\n\n"

        # Group papers by year
        papers_by_year = {}
        for paper in papers:
            year = paper.get('year', 'Unknown')
            if year not in papers_by_year:
                papers_by_year[year] = []
            papers_by_year[year].append(paper)

        review = "\\section{Literature Review}\n\n"
        review += f"A total of {len(papers)} papers were included in this systematic review.\n\n"

        review += "\\subsection{Temporal Distribution}\n\n"
        review += "The following table shows the distribution of papers by year:\n\n"
        review += "\\begin{table}[h]\n\\centering\n"
        review += "\\begin{tabular}{cc}\n\\toprule\n"
        review += "\\textbf{Year} & \\textbf{Count} \\\\\n\\midrule\n"

        for year in sorted(papers_by_year.keys(), reverse=True):
            review += f"{year} & {len(papers_by_year[year])} \\\\\n"

        review += "\\bottomrule\n\\end{tabular}\n"
        review += "\\caption{Papers by publication year}\n"
        review += "\\end{table}\n\n"

        return review

    def _generate_references_section(self) -> str:
        """Generate references section."""
        return """\\section{References}

\\bibliographystyle{plain}
\\bibliography{references}

"""

    def _generate_conclusion_section(self, paper_count: int) -> str:
        """Generate conclusion section."""
        return f"""\\section{{Conclusion}}

This systematic literature review identified and analyzed {paper_count} papers relevant to the specified search criteria.
The review followed PRISMA guidelines to ensure systematic and transparent reporting.

This document was automatically generated by LitRevTool, providing a foundation for further manual analysis and synthesis.

"""

    def generate_latex_document(
        self,
        papers: List[Dict],
        search_criteria: Dict,
        prisma_metrics: Dict = None,
        output_path: str = None,
        title: str = "Systematic Literature Review",
        author: str = "Generated by LitRevTool"
    ) -> str:
        """
        Generate complete LaTeX document.

        Args:
            papers: List of paper dictionaries
            search_criteria: Search parameters used
            prisma_metrics: PRISMA metrics dictionary
            output_path: Optional path to save the file
            title: Document title
            author: Document author

        Returns:
            Complete LaTeX content as string
        """
        latex_content = []

        # Header
        latex_content.append(self._generate_latex_header(title, author))

        # Introduction with search methodology
        latex_content.append(self._generate_introduction_section(search_criteria))

        # PRISMA section
        if prisma_metrics:
            latex_content.append(self._generate_prisma_section(prisma_metrics))

        # Literature review (AI-generated if possible)
        latex_content.append(self._generate_literature_review_with_ai(papers, search_criteria))

        # Conclusion
        latex_content.append(self._generate_conclusion_section(len(papers)))

        # References
        latex_content.append(self._generate_references_section())

        # End document
        latex_content.append("\\end{document}")

        full_content = "\n".join(latex_content)

        # Save to file if path provided
        if output_path:
            try:
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(full_content)
                logger.info(f"LaTeX document saved to {output_path}")
            except Exception as e:
                logger.error(f"Error saving LaTeX document: {e}")

        return full_content


def generate_systematic_review(
    papers: List[Dict],
    search_criteria: Dict,
    prisma_metrics: Dict = None,
    latex_output_path: str = None,
    bibtex_output_path: str = None,
    title: str = "Systematic Literature Review"
) -> tuple:
    """
    Generate both LaTeX document and BibTeX file for systematic review.

    Args:
        papers: List of paper dictionaries
        search_criteria: Search parameters
        prisma_metrics: PRISMA metrics
        latex_output_path: Path to save LaTeX file
        bibtex_output_path: Path to save BibTeX file
        title: Document title

    Returns:
        Tuple of (latex_content, bibtex_content)
    """
    # Generate LaTeX
    latex_gen = LaTeXReviewGenerator()
    latex_content = latex_gen.generate_latex_document(
        papers=papers,
        search_criteria=search_criteria,
        prisma_metrics=prisma_metrics,
        output_path=latex_output_path,
        title=title
    )

    # Generate BibTeX
    bibtex_gen = BibTeXGenerator()
    bibtex_content = bibtex_gen.generate_bibtex_file(
        papers=papers,
        output_path=bibtex_output_path
    )

    return latex_content, bibtex_content
