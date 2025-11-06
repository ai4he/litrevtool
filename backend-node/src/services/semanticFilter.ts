import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../core/config';
import logger from '../core/logger';

interface Paper {
  title?: string;
  abstract?: string;
  semantic_score?: number;
  [key: string]: any;
}

class SemanticFilter {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey?: string) {
    const key = apiKey || config.GEMINI_API_KEY;
    this.genAI = new GoogleGenerativeAI(key);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  async filterPapers(
    papers: Paper[],
    inclusionCriteria?: string,
    exclusionCriteria?: string,
    batchSize: number = 10
  ): Promise<Paper[]> {
    if (!inclusionCriteria && !exclusionCriteria) {
      return papers;
    }

    const filteredPapers: Paper[] = [];

    // Process papers in batches
    for (let i = 0; i < papers.length; i += batchSize) {
      const batch = papers.slice(i, i + batchSize);

      try {
        // Create prompt for batch evaluation
        const prompt = this.createFilterPrompt(batch, inclusionCriteria, exclusionCriteria);

        // Call Gemini API
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const responseText = response.text();

        // Parse response to get which papers to keep
        const keepIndices = this.parseFilterResponse(responseText, batch.length);

        // Add kept papers to results
        for (const idx of keepIndices) {
          if (idx < batch.length) {
            const paper = { ...batch[idx] };
            paper.semantic_score = 1; // Mark as passing semantic filter
            filteredPapers.push(paper);
          }
        }

        logger.info(
          `Batch ${Math.floor(i / batchSize) + 1}: Kept ${keepIndices.length}/${batch.length} papers`
        );
      } catch (error) {
        logger.error(`Error in semantic filtering batch ${Math.floor(i / batchSize) + 1}:`, error);
        // On error, include all papers from this batch to be safe
        filteredPapers.push(...batch);
      }
    }

    return filteredPapers;
  }

  private createFilterPrompt(
    papers: Paper[],
    inclusionCriteria?: string,
    exclusionCriteria?: string
  ): string {
    let prompt =
      'You are a research paper screening assistant. Evaluate the following papers based on the given criteria.\n\n';

    if (inclusionCriteria) {
      prompt += `INCLUSION CRITERIA: ${inclusionCriteria}\n`;
    }
    if (exclusionCriteria) {
      prompt += `EXCLUSION CRITERIA: ${exclusionCriteria}\n`;
    }

    prompt += '\nPAPERS TO EVALUATE:\n';

    papers.forEach((paper, i) => {
      const title = paper.title || 'No title';
      const abstract = paper.abstract || 'No abstract available';
      const truncatedAbstract = abstract.substring(0, 500);
      prompt += `\n${i}. Title: ${title}\n   Abstract: ${truncatedAbstract}...\n`;
    });

    prompt += '\nFor each paper, determine if it should be INCLUDED based on the criteria above. ';
    prompt += 'Respond with ONLY the numbers of papers to INCLUDE, separated by commas. ';
    prompt += 'For example: 0,2,5,7\n';
    prompt += 'If no papers should be included, respond with: NONE\n';

    return prompt;
  }

  private parseFilterResponse(responseText: string, numPapers: number): number[] {
    try {
      const trimmed = responseText.trim();

      if (trimmed.toUpperCase() === 'NONE') {
        return [];
      }

      // Extract numbers from response
      const indices: number[] = [];
      for (const part of trimmed.split(',')) {
        try {
          const idx = parseInt(part.trim(), 10);
          if (idx >= 0 && idx < numPapers) {
            indices.push(idx);
          }
        } catch (err) {
          continue;
        }
      }

      return indices;
    } catch (error) {
      logger.error('Error parsing filter response:', error);
      // On parse error, include all papers to be safe
      return Array.from({ length: numPapers }, (_, i) => i);
    }
  }

  async scoreRelevance(paper: Paper, criteria: string): Promise<number> {
    try {
      const title = paper.title || 'No title';
      const abstract = paper.abstract || 'No abstract available';
      const truncatedAbstract = abstract.substring(0, 1000);

      const prompt = `Rate how relevant this research paper is to the following criteria on a scale of 0-10:

CRITERIA: ${criteria}

PAPER:
Title: ${title}
Abstract: ${truncatedAbstract}

Respond with ONLY a number from 0-10, where:
- 0 = Completely irrelevant
- 5 = Somewhat relevant
- 10 = Highly relevant

Your response (number only):`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const scoreText = response.text().trim();

      // Extract number from response
      const score = parseFloat(scoreText);
      return Math.min(Math.max(score / 10.0, 0.0), 1.0); // Normalize to 0-1
    } catch (error) {
      logger.error('Error scoring relevance:', error);
      return 0.5; // Default to neutral score on error
    }
  }
}

export default SemanticFilter;
