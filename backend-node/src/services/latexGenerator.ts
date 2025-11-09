/**
 * LaTeX Systematic Literature Review Generator
 * Generates LaTeX documents for systematic literature reviews using Gemini AI
 */
import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../core/config';
import logger from '../core/logger';
import { BibTeXGenerator } from './bibtexGenerator';

interface Paper {
  title: string;
  authors?: string;
  year?: number;
  abstract?: string;
  url?: string;
  source?: string;
  publisher?: string;
  citations?: number;
  [key: string]: any;
}

interface SearchCriteria {
  keywords_include?: string[];
  keywords_exclude?: string[];
  start_year?: number;
  end_year?: number;
  [key: string]: any;
}

interface PrismaMetrics {
  identification?: {
    records_identified: number;
  };
  screening?: {
    records_excluded_duplicates: number;
    records_after_duplicates_removed: number;
  };
  eligibility?: {
    full_text_assessed: number;
    full_text_excluded_semantic: number;
  };
  included?: {
    studies_included: number;
  };
}

export class LaTeXReviewGenerator {
  private genAI?: GoogleGenerativeAI;
  private model?: any;
  private bibtexGen: BibTeXGenerator;

  constructor() {
    this.bibtexGen = new BibTeXGenerator();

    // Configure Gemini
    if (config.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    } else {
      logger.warn('GEMINI_API_KEY not configured, AI generation disabled');
    }
  }

  private generateLatexHeader(title: string, author: string = 'Anonymous'): string {
    return `\\documentclass[12pt,a4paper]{article}

% Packages
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\usepackage{cite}
\\usepackage{url}
\\usepackage{hyperref}
\\usepackage{graphicx}
\\usepackage{booktabs}
\\usepackage{longtable}

% Page geometry
\\geometry{
    a4paper,
    left=2.5cm,
    right=2.5cm,
    top=2.5cm,
    bottom=2.5cm
}

% Hyperref setup
\\hypersetup{
    colorlinks=true,
    linkcolor=blue,
    citecolor=blue,
    urlcolor=blue
}

% Title information
\\title{${title}}
\\author{${author}}
\\date{\\today}

\\begin{document}

\\maketitle

\\begin{abstract}
This systematic literature review was automatically generated using LitRevTool.
The review analyzes papers collected from Google Scholar based on specific search criteria.
The PRISMA methodology was followed to ensure systematic and transparent reporting.
\\end{abstract}

\\tableofcontents
\\newpage
`;
  }

  private generateIntroductionSection(searchCriteria: SearchCriteria): string {
    const keywordsInc = (searchCriteria.keywords_include || []).join(', ');
    const keywordsExc = (searchCriteria.keywords_exclude || []).join(', ');
    const startYear = searchCriteria.start_year || 'N/A';
    const endYear = searchCriteria.end_year || 'N/A';

    let intro = `\\section{Introduction}

This systematic literature review examines the research literature based on the following search strategy:

\\subsection{Search Criteria}

\\begin{itemize}
    \\item \\textbf{Inclusion Keywords}: ${keywordsInc}
`;

    if (keywordsExc) {
      intro += `    \\item \\textbf{Exclusion Keywords}: ${keywordsExc}\n`;
    }

    intro += `    \\item \\textbf{Year Range}: ${startYear} to ${endYear}
    \\item \\textbf{Database}: Google Scholar
\\end{itemize}

\\subsection{Methodology}

This review follows the PRISMA (Preferred Reporting Items for Systematic Reviews and Meta-Analyses) guidelines.
The search was conducted using LitRevTool, which overcomes Google Scholar's limitations by splitting searches by year.

`;
    return intro;
  }

  private generatePrismaSection(prismaMetrics?: PrismaMetrics): string {
    if (!prismaMetrics) return '';

    const identification = prismaMetrics.identification?.records_identified || 0;
    const duplicatesRemoved = prismaMetrics.screening?.records_excluded_duplicates || 0;
    const afterDedup = prismaMetrics.screening?.records_after_duplicates_removed || 0;
    const assessed = prismaMetrics.eligibility?.full_text_assessed || 0;
    const excluded = prismaMetrics.eligibility?.full_text_excluded_semantic || 0;
    const included = prismaMetrics.included?.studies_included || 0;

    return `\\section{PRISMA Flow}

The following table summarizes the systematic review process according to PRISMA 2020 guidelines:

\\begin{table}[h]
\\centering
\\begin{tabular}{ll}
\\toprule
\\textbf{Stage} & \\textbf{Count} \\\\
\\midrule
\\textbf{Identification} & \\\\
Records identified from database searching & ${identification} \\\\
\\midrule
\\textbf{Screening} & \\\\
Duplicate records removed & ${duplicatesRemoved} \\\\
Records after duplicates removed & ${afterDedup} \\\\
\\midrule
\\textbf{Eligibility} & \\\\
Full-text articles assessed & ${assessed} \\\\
Full-text articles excluded & ${excluded} \\\\
\\midrule
\\textbf{Included} & \\\\
\\textbf{Studies included in review} & \\textbf{${included}} \\\\
\\bottomrule
\\end{tabular}
\\caption{PRISMA 2020 flow summary}
\\label{tab:prisma}
\\end{table}

`;
  }

  private async generateResultsSection(papers: Paper[]): Promise<string> {
    let section = `\\section{Results}

A total of ${papers.length} papers were identified and included in this review.

\\subsection{Overview of Included Studies}

The following table provides an overview of the included studies:

\\begin{longtable}{p{0.4\\textwidth}p{0.3\\textwidth}p{0.15\\textwidth}p{0.1\\textwidth}}
\\toprule
\\textbf{Title} & \\textbf{Authors} & \\textbf{Source} & \\textbf{Year} \\\\
\\midrule
\\endfirsthead

\\multicolumn{4}{c}{\\textit{(Continued)}} \\\\
\\toprule
\\textbf{Title} & \\textbf{Authors} & \\textbf{Source} & \\textbf{Year} \\\\
\\midrule
\\endhead

\\bottomrule
\\endfoot

`;

    // Add papers to table (limit to prevent huge tables)
    const papersToShow = papers.slice(0, 100);
    for (const paper of papersToShow) {
      const title = this.escapeLatex(paper.title || '');
      const authors = this.escapeLatex((paper.authors || '').substring(0, 50));
      const source = this.escapeLatex((paper.source || '').substring(0, 30));
      const year = paper.year || 'N/A';

      section += `${title} & ${authors} & ${source} & ${year} \\\\\n`;
    }

    section += `\\end{longtable}\n\n`;

    // Add AI-generated analysis if available
    if (this.model && papers.length > 0) {
      try {
        logger.info('LaTeX: Generating AI analysis of papers...');
        const analysis = await this.generateAIAnalysis(papers);
        section += `\\subsection{Key Findings}\n\n${analysis}\n\n`;
      } catch (error) {
        logger.error('LaTeX: Failed to generate AI analysis', error);
      }
    }

    return section;
  }

  private async generateAIAnalysis(papers: Paper[]): Promise<string> {
    if (!this.model) return '';

    try {
      // Prepare paper summaries (limit to avoid token limits)
      const paperSummaries = papers.slice(0, 20).map((p, i) => {
        return `${i + 1}. ${p.title} (${p.year || 'N/A'})${p.abstract ? `: ${p.abstract.substring(0, 200)}...` : ''}`;
      });

      const prompt = `You are a research analyst. Based on the following academic papers, provide a brief analysis (3-4 paragraphs) of the key findings, trends, and themes. Format the output in LaTeX-compatible plain text (no special LaTeX commands needed, just paragraphs):

Papers:
${paperSummaries.join('\n\n')}

Provide a concise academic analysis of these papers:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      logger.error('LaTeX: AI analysis error', error);
      return '';
    }
  }

  private generateConclusionSection(papers: Paper[]): string {
    return `\\section{Conclusion}

This systematic literature review identified ${papers.length} relevant studies based on the specified search criteria.
The review provides a comprehensive overview of the current state of research in this area.

Future research directions and gaps identified in the literature should be addressed to advance the field further.

`;
  }

  private generateReferencesSection(): string {
    return `\\section{References}

\\bibliographystyle{plain}
\\bibliography{references}

`;
  }

  private escapeLatex(text: string): string {
    if (!text) return '';

    return text
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/[&%$#_{}]/g, (match) => '\\' + match)
      .replace(/~/g, '\\textasciitilde{}')
      .replace(/\^/g, '\\textasciicircum{}');
  }

  /**
   * Generate a complete LaTeX systematic literature review
   */
  async generateReview(options: {
    papers: Paper[];
    searchCriteria: SearchCriteria;
    prismaMetrics?: PrismaMetrics;
    title?: string;
    author?: string;
    outputPath?: string;
  }): Promise<string> {
    const { papers, searchCriteria, prismaMetrics, title, author, outputPath } = options;

    logger.info(`LaTeX: Generating review for ${papers.length} papers`);

    const reviewTitle = title || 'Systematic Literature Review';
    const reviewAuthor = author || 'LitRevTool';

    const sections: string[] = [];

    // Header
    sections.push(this.generateLatexHeader(reviewTitle, reviewAuthor));

    // Introduction
    sections.push(this.generateIntroductionSection(searchCriteria));

    // PRISMA
    if (prismaMetrics) {
      sections.push(this.generatePrismaSection(prismaMetrics));
    }

    // Results
    sections.push(await this.generateResultsSection(papers));

    // Conclusion
    sections.push(this.generateConclusionSection(papers));

    // References
    sections.push(this.generateReferencesSection());

    // Footer
    sections.push('\\end{document}');

    const fullContent = sections.join('\n');

    // Save to file if path provided
    if (outputPath) {
      try {
        fs.writeFileSync(outputPath, fullContent, 'utf-8');
        logger.info(`LaTeX file saved to ${outputPath}`);
      } catch (error) {
        logger.error('Error saving LaTeX file:', error);
      }
    }

    return fullContent;
  }
}

/**
 * Convenience function to generate LaTeX review
 */
export async function generateLatexReview(options: {
  papers: Paper[];
  searchCriteria: SearchCriteria;
  prismaMetrics?: PrismaMetrics;
  title?: string;
  author?: string;
  outputPath?: string;
}): Promise<string> {
  const generator = new LaTeXReviewGenerator();
  return generator.generateReview(options);
}
