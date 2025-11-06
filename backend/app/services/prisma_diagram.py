"""
PRISMA Flow Diagram Generator

Generates PRISMA (Preferred Reporting Items for Systematic Reviews and Meta-Analyses)
flow diagrams as SVG images based on search job metrics.

Reference: http://www.prisma-statement.org/
"""

import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class PRISMADiagramGenerator:
    """Generates PRISMA flow diagrams as SVG."""

    def __init__(self):
        # Diagram dimensions and styling
        self.width = 800
        self.height = 900
        self.box_width = 300
        self.box_height = 80
        self.spacing = 40
        self.left_margin = 50
        self.top_margin = 50

        # Colors matching PRISMA standard style
        self.box_fill = "#E8F4F8"
        self.box_stroke = "#2C5F7C"
        self.excluded_box_fill = "#FFE8E8"
        self.excluded_box_stroke = "#B85450"
        self.arrow_color = "#2C5F7C"
        self.text_color = "#1a1a1a"

    def generate_diagram(self, prisma_metrics: Dict) -> str:
        """
        Generate PRISMA flow diagram as SVG string.

        Args:
            prisma_metrics: Dictionary containing PRISMA metrics with structure:
                {
                    'identification': {'records_identified': int, 'records_from_database': int},
                    'screening': {
                        'records_after_duplicates_removed': int,
                        'records_screened': int,
                        'records_excluded_duplicates': int
                    },
                    'eligibility': {
                        'full_text_assessed': int,
                        'full_text_excluded_semantic': int
                    },
                    'included': {'studies_included': int}
                }

        Returns:
            SVG string representing the PRISMA flow diagram
        """
        if not prisma_metrics:
            return self._generate_empty_diagram()

        svg_parts = []

        # SVG header
        svg_parts.append(f'''<svg width="{self.width}" height="{self.height}" xmlns="http://www.w3.org/2000/svg">
    <!-- PRISMA Flow Diagram -->
    <defs>
        <style>
            .box {{ fill: {self.box_fill}; stroke: {self.box_stroke}; stroke-width: 2; }}
            .excluded-box {{ fill: {self.excluded_box_fill}; stroke: {self.excluded_box_stroke}; stroke-width: 2; }}
            .text {{ font-family: Arial, sans-serif; font-size: 14px; fill: {self.text_color}; }}
            .text-bold {{ font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; fill: {self.text_color}; }}
            .text-small {{ font-family: Arial, sans-serif; font-size: 12px; fill: {self.text_color}; }}
            .title {{ font-family: Arial, sans-serif; font-size: 18px; font-weight: bold; fill: {self.text_color}; }}
            .arrow {{ stroke: {self.arrow_color}; stroke-width: 2; fill: none; marker-end: url(#arrowhead); }}
        </style>
        <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="{self.arrow_color}" />
        </marker>
    </defs>
''')

        # Title
        svg_parts.append(f'    <text x="{self.width/2}" y="30" class="title" text-anchor="middle">PRISMA Flow Diagram</text>\n')

        # Current Y position
        y = self.top_margin + 30

        # IDENTIFICATION
        identification = prisma_metrics.get('identification', {})
        records_identified = identification.get('records_identified', 0)

        svg_parts.append(self._create_box(
            x=self.left_margin,
            y=y,
            title="Identification",
            content=f"Records identified from\ndatabase searching\n(n = {records_identified})"
        ))
        y += self.box_height + self.spacing

        # Arrow
        svg_parts.append(self._create_arrow(
            x1=self.left_margin + self.box_width/2,
            y1=y - self.spacing,
            x2=self.left_margin + self.box_width/2,
            y2=y
        ))

        # SCREENING
        screening = prisma_metrics.get('screening', {})
        duplicates_removed = screening.get('records_excluded_duplicates', 0)
        after_duplicates = screening.get('records_after_duplicates_removed', 0)
        records_screened = screening.get('records_screened', 0)

        # Main screening box
        svg_parts.append(self._create_box(
            x=self.left_margin,
            y=y,
            title="Screening",
            content=f"Records after duplicates removed\n(n = {after_duplicates})\n \nRecords screened\n(n = {records_screened})"
        ))

        # Excluded box (duplicates)
        if duplicates_removed > 0:
            svg_parts.append(self._create_excluded_box(
                x=self.left_margin + self.box_width + 80,
                y=y,
                content=f"Duplicates removed\n(n = {duplicates_removed})"
            ))
            # Arrow to excluded box
            svg_parts.append(self._create_arrow(
                x1=self.left_margin + self.box_width,
                y1=y + self.box_height/2,
                x2=self.left_margin + self.box_width + 80,
                y2=y + self.box_height/2
            ))

        y += self.box_height + self.spacing

        # ELIGIBILITY (if semantic filtering was used)
        eligibility = prisma_metrics.get('eligibility', {})
        full_text_assessed = eligibility.get('full_text_assessed', 0)
        excluded_semantic = eligibility.get('full_text_excluded_semantic', 0)

        if full_text_assessed > 0:
            # Arrow
            svg_parts.append(self._create_arrow(
                x1=self.left_margin + self.box_width/2,
                y1=y - self.spacing,
                x2=self.left_margin + self.box_width/2,
                y2=y
            ))

            # Main eligibility box
            svg_parts.append(self._create_box(
                x=self.left_margin,
                y=y,
                title="Eligibility",
                content=f"Papers assessed for eligibility\nwith semantic filtering\n(n = {full_text_assessed})"
            ))

            # Excluded box (semantic)
            if excluded_semantic > 0:
                svg_parts.append(self._create_excluded_box(
                    x=self.left_margin + self.box_width + 80,
                    y=y,
                    content=f"Papers excluded by\nsemantic filtering\n(n = {excluded_semantic})"
                ))
                # Arrow to excluded box
                svg_parts.append(self._create_arrow(
                    x1=self.left_margin + self.box_width,
                    y1=y + self.box_height/2,
                    x2=self.left_margin + self.box_width + 80,
                    y2=y + self.box_height/2
                ))

            y += self.box_height + self.spacing

        # Arrow to included
        svg_parts.append(self._create_arrow(
            x1=self.left_margin + self.box_width/2,
            y1=y - self.spacing,
            x2=self.left_margin + self.box_width/2,
            y2=y
        ))

        # INCLUDED
        included = prisma_metrics.get('included', {})
        studies_included = included.get('studies_included', 0)

        svg_parts.append(self._create_box(
            x=self.left_margin,
            y=y,
            title="Included",
            content=f"Studies included in review\n(n = {studies_included})",
            highlight=True
        ))

        # Footer
        svg_parts.append(f'    <text x="{self.width/2}" y="{self.height - 20}" class="text-small" text-anchor="middle" opacity="0.6">Generated by LitRevTool - PRISMA 2020</text>\n')

        # Close SVG
        svg_parts.append('</svg>')

        return ''.join(svg_parts)

    def _create_box(self, x: float, y: float, title: str, content: str, highlight: bool = False) -> str:
        """Create a main flow box with title and content."""
        box_class = "box"
        lines = content.split('\n')

        svg = f'    <rect x="{x}" y="{y}" width="{self.box_width}" height="{self.box_height}" class="{box_class}" rx="5"/>\n'

        # Title (stage name)
        svg += f'    <text x="{x + self.box_width/2}" y="{y + 18}" class="text-bold" text-anchor="middle">{title}</text>\n'

        # Content lines
        line_y = y + 35
        for line in lines:
            if line.strip():
                svg += f'    <text x="{x + self.box_width/2}" y="{line_y}" class="text-small" text-anchor="middle">{line}</text>\n'
                line_y += 16

        return svg

    def _create_excluded_box(self, x: float, y: float, content: str) -> str:
        """Create an excluded records box (shown on the right)."""
        excluded_width = 220
        excluded_height = self.box_height

        lines = content.split('\n')

        svg = f'    <rect x="{x}" y="{y}" width="{excluded_width}" height="{excluded_height}" class="excluded-box" rx="5"/>\n'

        # Content lines
        line_y = y + 25
        for line in lines:
            if line.strip():
                svg += f'    <text x="{x + excluded_width/2}" y="{line_y}" class="text-small" text-anchor="middle">{line}</text>\n'
                line_y += 18

        return svg

    def _create_arrow(self, x1: float, y1: float, x2: float, y2: float) -> str:
        """Create an arrow line."""
        return f'    <line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" class="arrow"/>\n'

    def _generate_empty_diagram(self) -> str:
        """Generate a placeholder diagram when no metrics are available."""
        return f'''<svg width="{self.width}" height="200" xmlns="http://www.w3.org/2000/svg">
    <rect width="{self.width}" height="200" fill="#f5f5f5"/>
    <text x="{self.width/2}" y="100" font-family="Arial" font-size="16" fill="#666" text-anchor="middle">
        PRISMA metrics not yet available
    </text>
    <text x="{self.width/2}" y="130" font-family="Arial" font-size="14" fill="#999" text-anchor="middle">
        Diagram will be generated when search completes
    </text>
</svg>'''


def generate_prisma_diagram(prisma_metrics: Dict, output_path: Optional[str] = None) -> str:
    """
    Generate PRISMA flow diagram.

    Args:
        prisma_metrics: PRISMA metrics dictionary
        output_path: Optional path to save SVG file

    Returns:
        SVG string
    """
    generator = PRISMADiagramGenerator()
    svg_content = generator.generate_diagram(prisma_metrics)

    if output_path:
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(svg_content)
            logger.info(f"PRISMA diagram saved to {output_path}")
        except Exception as e:
            logger.error(f"Error saving PRISMA diagram: {e}")

    return svg_content
