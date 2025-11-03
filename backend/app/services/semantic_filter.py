import logging
from typing import List, Dict, Optional
import google.generativeai as genai
from app.core.config import settings

logger = logging.getLogger(__name__)


class SemanticFilter:
    """
    Uses Google Gemini API to perform semantic filtering on papers.

    This allows users to filter papers based on semantic criteria beyond
    simple keyword matching, e.g., "papers that focus on practical applications"
    or "papers with novel theoretical contributions".
    """

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the semantic filter.

        Args:
            api_key: Google Gemini API key. If None, uses settings.
        """
        self.api_key = api_key or settings.GEMINI_API_KEY
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-pro')

    def filter_papers(
        self,
        papers: List[Dict],
        inclusion_criteria: Optional[str] = None,
        exclusion_criteria: Optional[str] = None,
        batch_size: int = 10
    ) -> List[Dict]:
        """
        Filter papers based on semantic criteria.

        Args:
            papers: List of paper dictionaries with 'title' and 'abstract'
            inclusion_criteria: Semantic criteria for inclusion (e.g., "practical applications")
            exclusion_criteria: Semantic criteria for exclusion (e.g., "purely theoretical")
            batch_size: Number of papers to process in each API call

        Returns:
            List of papers that meet the criteria
        """
        if not inclusion_criteria and not exclusion_criteria:
            return papers

        filtered_papers = []

        # Process papers in batches to reduce API calls
        for i in range(0, len(papers), batch_size):
            batch = papers[i:i + batch_size]

            try:
                # Create a prompt for batch evaluation
                prompt = self._create_filter_prompt(batch, inclusion_criteria, exclusion_criteria)

                # Call Gemini API
                response = self.model.generate_content(prompt)

                # Parse response to get which papers to keep
                keep_indices = self._parse_filter_response(response.text, len(batch))

                # Add kept papers to results
                for idx in keep_indices:
                    if idx < len(batch):
                        paper = batch[idx].copy()
                        paper['semantic_score'] = 1  # Mark as passing semantic filter
                        filtered_papers.append(paper)

                logger.info(f"Batch {i//batch_size + 1}: Kept {len(keep_indices)}/{len(batch)} papers")

            except Exception as e:
                logger.error(f"Error in semantic filtering batch {i//batch_size + 1}: {e}")
                # On error, include all papers from this batch to be safe
                filtered_papers.extend(batch)

        return filtered_papers

    def _create_filter_prompt(
        self,
        papers: List[Dict],
        inclusion_criteria: Optional[str],
        exclusion_criteria: Optional[str]
    ) -> str:
        """Create a prompt for the Gemini API to evaluate papers."""
        prompt = "You are a research paper screening assistant. Evaluate the following papers based on the given criteria.\n\n"

        if inclusion_criteria:
            prompt += f"INCLUSION CRITERIA: {inclusion_criteria}\n"
        if exclusion_criteria:
            prompt += f"EXCLUSION CRITERIA: {exclusion_criteria}\n"

        prompt += "\nPAPERS TO EVALUATE:\n"

        for i, paper in enumerate(papers):
            title = paper.get('title', 'No title')
            abstract = paper.get('abstract', 'No abstract available')
            prompt += f"\n{i}. Title: {title}\n   Abstract: {abstract[:500]}...\n"

        prompt += "\nFor each paper, determine if it should be INCLUDED based on the criteria above. "
        prompt += "Respond with ONLY the numbers of papers to INCLUDE, separated by commas. "
        prompt += "For example: 0,2,5,7\n"
        prompt += "If no papers should be included, respond with: NONE\n"

        return prompt

    def _parse_filter_response(self, response_text: str, num_papers: int) -> List[int]:
        """
        Parse the Gemini API response to extract paper indices to keep.

        Args:
            response_text: Raw response from Gemini
            num_papers: Number of papers in the batch

        Returns:
            List of indices of papers to keep
        """
        try:
            response_text = response_text.strip()

            if response_text.upper() == "NONE":
                return []

            # Extract numbers from response
            indices = []
            for part in response_text.split(','):
                try:
                    idx = int(part.strip())
                    if 0 <= idx < num_papers:
                        indices.append(idx)
                except ValueError:
                    continue

            return indices

        except Exception as e:
            logger.error(f"Error parsing filter response: {e}")
            # On parse error, include all papers to be safe
            return list(range(num_papers))

    def score_relevance(self, paper: Dict, criteria: str) -> float:
        """
        Score a single paper's relevance to given criteria.

        Args:
            paper: Paper dictionary with 'title' and 'abstract'
            criteria: Relevance criteria

        Returns:
            Relevance score from 0.0 to 1.0
        """
        try:
            title = paper.get('title', 'No title')
            abstract = paper.get('abstract', 'No abstract available')

            prompt = f"""Rate how relevant this research paper is to the following criteria on a scale of 0-10:

CRITERIA: {criteria}

PAPER:
Title: {title}
Abstract: {abstract[:1000]}

Respond with ONLY a number from 0-10, where:
- 0 = Completely irrelevant
- 5 = Somewhat relevant
- 10 = Highly relevant

Your response (number only):"""

            response = self.model.generate_content(prompt)
            score_text = response.text.strip()

            # Extract number from response
            score = float(score_text)
            return min(max(score / 10.0, 0.0), 1.0)  # Normalize to 0-1

        except Exception as e:
            logger.error(f"Error scoring relevance: {e}")
            return 0.5  # Default to neutral score on error


def test_semantic_filter():
    """Test function for semantic filtering."""
    filter = SemanticFilter()

    # Test papers
    papers = [
        {
            "title": "Deep Learning for Image Classification",
            "abstract": "This paper presents a novel deep learning approach for classifying images..."
        },
        {
            "title": "Quantum Computing Algorithms",
            "abstract": "We explore new quantum algorithms for solving optimization problems..."
        },
        {
            "title": "Machine Learning in Healthcare",
            "abstract": "Application of machine learning techniques to diagnose diseases..."
        }
    ]

    # Filter for machine learning papers
    filtered = filter.filter_papers(
        papers,
        inclusion_criteria="papers about machine learning and deep learning",
        exclusion_criteria="papers about quantum computing"
    )

    print(f"Filtered {len(filtered)} papers from {len(papers)}:")
    for paper in filtered:
        print(f"- {paper['title']}")


if __name__ == "__main__":
    test_semantic_filter()
