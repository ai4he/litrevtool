import { createObjectCsvWriter } from 'csv-writer';
import path from 'path';
import { config } from '../core/config';
import logger from '../core/logger';

interface Paper {
  title: string;
  authors?: string;
  year?: number;
  source?: string;
  publisher?: string;
  citations?: number;
  abstract?: string;
  url?: string;
  doi?: string;
  semanticScore?: number;
}

export async function writePapersToCSV(
  papers: Paper[],
  jobId: string,
  jobName: string
): Promise<string> {
  const filename = `${jobName.replace(/\s+/g, '_')}_${jobId}.csv`;
  const filepath = path.join(config.UPLOAD_DIR, filename);

  const csvWriter = createObjectCsvWriter({
    path: filepath,
    header: [
      { id: 'title', title: 'Title' },
      { id: 'authors', title: 'Authors' },
      { id: 'year', title: 'Year' },
      { id: 'source', title: 'Source' },
      { id: 'publisher', title: 'Publisher' },
      { id: 'citations', title: 'Citations' },
      { id: 'abstract', title: 'Abstract' },
      { id: 'url', title: 'URL' },
      { id: 'doi', title: 'DOI' },
      { id: 'semanticScore', title: 'Semantic_Score' },
    ],
  });

  const records = papers.map((paper) => ({
    title: paper.title || '',
    authors: paper.authors || '',
    year: paper.year || '',
    source: paper.source || '',
    publisher: paper.publisher || '',
    citations: paper.citations || 0,
    abstract: paper.abstract || '',
    url: paper.url || '',
    doi: paper.doi || '',
    semanticScore: paper.semanticScore || '',
  }));

  await csvWriter.writeRecords(records);
  logger.info(`CSV file created: ${filepath}`);

  return filepath;
}
