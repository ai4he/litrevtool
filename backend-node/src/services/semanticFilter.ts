import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../core/config';
import logger from '../core/logger';

interface Paper {
  title?: string;
  abstract?: string;
  semantic_score?: number;
  is_excluded?: boolean;
  exclusion_reason?: string;
  semantic_rationale?: string;
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
      // If no criteria, mark all as included
      return papers.map(p => ({
        ...p,
        is_excluded: false,
        exclusion_reason: undefined
      }));
    }

    const allPapers: Paper[] = [];

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

        // Parse response to get decisions and rationales for each paper
        const decisions = this.parseFilterResponseWithRationales(responseText, batch.length);

        // Mark all papers with inclusion/exclusion status and rationales
        let includedCount = 0;
        for (let idx = 0; idx < batch.length; idx++) {
          const paper = { ...batch[idx] };
          const decision = decisions[idx];

          if (decision && decision.include) {
            // Paper passes semantic filter
            paper.semantic_score = 1;
            paper.is_excluded = false;
            paper.exclusion_reason = undefined;
            paper.semantic_rationale = decision.rationale || 'Meets inclusion criteria';
            includedCount++;
          } else {
            // Paper fails semantic filter
            paper.semantic_score = 0;
            paper.is_excluded = true;
            paper.exclusion_reason = 'Did not meet semantic filtering criteria';
            paper.semantic_rationale = decision?.rationale || 'Does not meet semantic filtering criteria';
          }

          allPapers.push(paper);
        }

        logger.info(
          `Batch ${Math.floor(i / batchSize) + 1}: Included ${includedCount}/${batch.length} papers, Excluded ${batch.length - includedCount}`
        );
      } catch (error) {
        logger.error(`Error in semantic filtering batch ${Math.floor(i / batchSize) + 1}:`, error);
        // On error, include all papers from this batch to be safe
        allPapers.push(...batch.map(p => ({
          ...p,
          is_excluded: false,
          exclusion_reason: 'Semantic filtering error - included by default'
        })));
      }
    }

    return allPapers;
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

    prompt += '\nFor each paper, provide a decision (INCLUDE or EXCLUDE) and a brief rationale (1-2 sentences). ';
    prompt += 'Format your response as JSON array with one object per paper:\n';
    prompt += '[\n';
    prompt += '  {"index": 0, "decision": "INCLUDE", "rationale": "Meets inclusion criteria because..."},\n';
    prompt += '  {"index": 1, "decision": "EXCLUDE", "rationale": "Does not meet criteria because..."}\n';
    prompt += ']\n';
    prompt += 'Respond ONLY with valid JSON, no other text.\n';

    return prompt;
  }

  private parseFilterResponseWithRationales(
    responseText: string,
    numPapers: number
  ): Array<{ include: boolean; rationale: string }> {
    try {
      const trimmed = responseText.trim();

      // Extract JSON from response (sometimes LLMs add extra text)
      const jsonMatch = trimmed.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        logger.warn('No JSON array found in response, defaulting to include all');
        return Array(numPapers).fill({ include: true, rationale: 'Unable to parse LLM response' });
      }

      const decisions = JSON.parse(jsonMatch[0]);
      const result: Array<{ include: boolean; rationale: string }> = [];

      // Create a map from the decisions
      const decisionMap = new Map<number, { include: boolean; rationale: string }>();
      for (const decision of decisions) {
        if (typeof decision.index === 'number' && decision.index >= 0 && decision.index < numPapers) {
          decisionMap.set(decision.index, {
            include: decision.decision?.toUpperCase() === 'INCLUDE',
            rationale: decision.rationale || 'No rationale provided',
          });
        }
      }

      // Fill in results for all papers
      for (let i = 0; i < numPapers; i++) {
        if (decisionMap.has(i)) {
          result.push(decisionMap.get(i)!);
        } else {
          // Default to exclude if not in response
          result.push({ include: false, rationale: 'Not evaluated by LLM' });
        }
      }

      return result;
    } catch (error) {
      logger.error('Error parsing filter response with rationales:', error);
      // On parse error, include all papers to be safe
      return Array(numPapers).fill({ include: true, rationale: 'Error parsing LLM response - included by default' });
    }
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
