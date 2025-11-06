import fs from 'fs';
import path from 'path';
import { config } from '../core/config';
import logger from '../core/logger';

interface PrismaMetrics {
  identification: number;
  screening: number;
  eligibility: number;
  included: number;
}

export function generatePrismaDiagram(
  metrics: PrismaMetrics,
  jobId: string,
  jobName: string
): string {
  const filename = `${jobName.replace(/\s+/g, '_')}_PRISMA_${jobId}.svg`;
  const filepath = path.join(config.UPLOAD_DIR, filename);

  // Simple SVG PRISMA diagram
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <style>
    .box { fill: #e3f2fd; stroke: #1976d2; stroke-width: 2; }
    .text { font-family: Arial; font-size: 14px; text-anchor: middle; }
    .title { font-size: 18px; font-weight: bold; }
    .arrow { stroke: #333; stroke-width: 2; fill: none; marker-end: url(#arrowhead); }
  </style>

  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#333" />
    </marker>
  </defs>

  <text x="400" y="30" class="text title">PRISMA 2020 Flow Diagram</text>

  <!-- Identification -->
  <rect x="300" y="60" width="200" height="60" class="box" />
  <text x="400" y="85" class="text">Identification</text>
  <text x="400" y="105" class="text">Records: ${metrics.identification}</text>

  <line x1="400" y1="120" x2="400" y2="150" class="arrow" />

  <!-- Screening -->
  <rect x="300" y="150" width="200" height="60" class="box" />
  <text x="400" y="175" class="text">Screening</text>
  <text x="400" y="195" class="text">Records: ${metrics.screening}</text>

  <line x1="400" y1="210" x2="400" y2="240" class="arrow" />

  <!-- Eligibility -->
  <rect x="300" y="240" width="200" height="60" class="box" />
  <text x="400" y="265" class="text">Eligibility</text>
  <text x="400" y="285" class="text">Records: ${metrics.eligibility}</text>

  <line x1="400" y1="300" x2="400" y2="330" class="arrow" />

  <!-- Included -->
  <rect x="300" y="330" width="200" height="60" class="box" />
  <text x="400" y="355" class="text">Included</text>
  <text x="400" y="375" class="text">Records: ${metrics.included}</text>
</svg>`;

  fs.writeFileSync(filepath, svg);
  logger.info(`PRISMA diagram created: ${filepath}`);

  return filepath;
}
