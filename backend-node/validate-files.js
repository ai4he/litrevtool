const fs = require('fs');
const path = require('path');
const glob = require('glob');

const jobId = 'bcac869b-cd40-43ea-bc83-7c349fbffd47';
const jobName = 'Maths020';

console.log('\n=== VALIDATING GENERATED FILES FOR COMPLETED JOB ===\n');

// Test 1: CSV File
const csvPath = `./uploads/${jobName}_${jobId}.csv`;
if (fs.existsSync(csvPath)) {
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n').filter(l => l.trim());
  const header = lines[0];

  console.log('✓ CSV FILE');
  console.log(`  - Path: ${csvPath}`);
  console.log(`  - Size: ${fs.statSync(csvPath).size} bytes`);
  console.log(`  - Rows: ${lines.length - 1} data rows`);
  console.log(`  - Columns: ${header.split(',').length}`);
  console.log(`  - Sample columns: ${header.split(',').slice(0, 5).join(', ')}`);

  if (header.includes('Semantic_Score')) {
    console.log('  - ✓ Contains Semantic_Score column (LLM filtering enabled)');
  }
} else {
  console.log('✗ CSV file not found');
}

// Test 2: PRISMA Diagram
const prismaPath = `./uploads/${jobName}_PRISMA_${jobId}.svg`;
if (fs.existsSync(prismaPath)) {
  const svgContent = fs.readFileSync(prismaPath, 'utf8');

  console.log('\n✓ PRISMA DIAGRAM (SVG)');
  console.log(`  - Path: ${prismaPath}`);
  console.log(`  - Size: ${fs.statSync(prismaPath).size} bytes`);
  console.log(`  - Valid SVG: ${svgContent.includes('<svg') ? 'Yes' : 'No'}`);
  console.log(`  - Contains PRISMA: ${svgContent.includes('PRISMA') ? 'Yes' : 'No'}`);
  console.log(`  - Contains flowchart elements: ${svgContent.includes('rect') || svgContent.includes('<path') ? 'Yes' : 'No'}`);
} else {
  console.log('\n✗ PRISMA diagram not found');
}

// Test 3: BibTeX File
const bibtexPath = `./uploads/${jobName}_References_${jobId}.bib`;
if (fs.existsSync(bibtexPath)) {
  const bibtexContent = fs.readFileSync(bibtexPath, 'utf8');
  const entries = (bibtexContent.match(/@/g) || []).length;

  console.log('\n✓ BIBTEX FILE');
  console.log(`  - Path: ${bibtexPath}`);
  console.log(`  - Size: ${fs.statSync(bibtexPath).size} bytes`);
  console.log(`  - Entries: ${entries}`);
  console.log(`  - Contains @article: ${bibtexContent.includes('@article') ? 'Yes' : 'No'}`);
  console.log(`  - Contains @inproceedings: ${bibtexContent.includes('@inproceedings') ? 'Yes' : 'No'}`);

  // Show sample entry
  const firstEntry = bibtexContent.substring(0, Math.min(300, bibtexContent.length));
  console.log(`  - Sample entry:\n${firstEntry.substring(0, 200)}...`);
} else {
  console.log('\n✗ BibTeX file not found');
}

// Test 4: LaTeX File (optional)
const latexPath = `./uploads/${jobName}_Review_${jobId}.tex`;
if (fs.existsSync(latexPath)) {
  const latexContent = fs.readFileSync(latexPath, 'utf8');

  console.log('\n✓ LATEX FILE');
  console.log(`  - Path: ${latexPath}`);
  console.log(`  - Size: ${fs.statSync(latexPath).size} bytes`);
  console.log(`  - Document class: ${latexContent.includes('\\documentclass') ? 'Yes' : 'No'}`);
  console.log(`  - Has sections: ${latexContent.includes('\\section') ? 'Yes' : 'No'}`);
  console.log(`  - Has bibliography: ${latexContent.includes('\\bibliography') ? 'Yes' : 'No'}`);
} else {
  console.log('\n⚠ LaTeX file not found (generation may not be enabled)');
}

// Test 5: Screenshots
const screenshotPattern = `./uploads/screenshots/scraper_${jobId}_*.png`;
const screenshots = glob.sync(screenshotPattern);

console.log('\n✓ SCREENSHOTS');
console.log(`  - Pattern: ${screenshotPattern}`);
console.log(`  - Count: ${screenshots.length} files`);
if (screenshots.length > 0) {
  const latestScreenshot = screenshots[screenshots.length - 1];
  const stats = fs.statSync(latestScreenshot);
  console.log(`  - Latest: ${path.basename(latestScreenshot)}`);
  console.log(`  - Size: ${stats.size} bytes`);
}

console.log('\n' + '='.repeat(60) + '\n');
