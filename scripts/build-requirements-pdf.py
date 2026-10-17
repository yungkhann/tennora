"""Build the revised requirements PDF from its reviewed Markdown source.

Run with reportlab and pymupdf installed (scripts/pdf-requirements.txt).
The original source PDF is never overwritten. Rendering QA is a separate step.
"""
from pathlib import Path
from xml.sax.saxutils import escape
import re
import reportlab
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, LongTable, TableStyle, PageBreak

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/REQUIREMENTS_REVISED.md'
DEST = ROOT / 'output/pdf/Tennora_Table_Tennis_Requirements_Revised.pdf'
FONTS = Path(reportlab.__file__).parent / 'fonts'
for name, file in [('Body','Vera.ttf'),('Bold','VeraBd.ttf'),('Italic','VeraIt.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(FONTS/file)))
pdfmetrics.registerFontFamily('Body',normal='Body',bold='Bold',italic='Italic',boldItalic='Bold')
GREEN=colors.HexColor('#164d39'); INK=colors.HexColor('#172c23'); MUTED=colors.HexColor('#586d60')
styles={
 'body': ParagraphStyle('body',fontName='Body',fontSize=9.1,leading=13,textColor=INK,spaceAfter=8),
 'h1': ParagraphStyle('h1',fontName='Bold',fontSize=22,leading=27,textColor=GREEN,spaceAfter=13,keepWithNext=True),
 'h2': ParagraphStyle('h2',fontName='Bold',fontSize=14,leading=19,textColor=GREEN,spaceBefore=14,spaceAfter=8,keepWithNext=True),
 'h3': ParagraphStyle('h3',fontName='Bold',fontSize=10.5,leading=15,textColor=INK,spaceBefore=9,spaceAfter=6,keepWithNext=True),
 'cell': ParagraphStyle('cell',fontName='Body',fontSize=8.1,leading=11.3,textColor=INK,spaceAfter=0),
 'head': ParagraphStyle('head',fontName='Bold',fontSize=8.1,leading=11.3,textColor=colors.white),
}

def inline(text):
    text=escape(text)
    text=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',text)
    text=re.sub(r'`([^`]+)`',r'\1',text)
    text=re.sub(r'\[([^]]+)\]\([^)]+\)',r'\1',text)
    return text

class PageCanvas(canvas.Canvas):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,**kwargs); self.pages=[]
    def showPage(self):
        self.pages.append(dict(self.__dict__)); self._startPage()
    def save(self):
        total=len(self.pages)
        for state in self.pages:
            self.__dict__.update(state)
            self.setStrokeColor(colors.HexColor('#dce5dd')); self.setLineWidth(.6)
            self.line(44,39,A4[0]-44,39)
            self.setFillColor(MUTED); self.setFont('Body',7)
            self.drawString(44,25,'Tennora | Technical requirements | Revision 0.2 | 17 October 2026')
            self.drawRightString(A4[0]-44,25,f'{self._pageNumber} / {total}')
            self.setFillColor(MUTED); self.setFont('Body',7)
            self.drawString(44,A4[1]-29,'SINGLE LEAGUE / NEXT.JS + SUPABASE / REQUIREMENTS BASELINE')
            super().showPage()
        super().save()

def build():
    lines=SOURCE.read_text().splitlines(); story=[]; i=0; width=A4[0]-88
    while i<len(lines):
        line=lines[i].strip()
        if not line: i+=1; continue
        if line.startswith('|'):
            rows=[]
            while i<len(lines) and lines[i].strip().startswith('|'):
                cells=[x.strip() for x in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-+:?',x or '-') for x in cells): rows.append(cells)
                i+=1
            count=len(rows[0]); ratios=([.25,.75] if count==2 else [.30]+[.70/(count-1)]*(count-1))
            data=[[Paragraph(inline(c),styles['head' if r==0 else 'cell']) for c in row] for r,row in enumerate(rows)]
            table=LongTable(data,colWidths=[width*x for x in ratios],repeatRows=1,hAlign='LEFT',splitInRow=1)
            table.setStyle(TableStyle([
              ('BACKGROUND',(0,0),(-1,0),GREEN),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#f1f5f0')]),
              ('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),
              ('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),
              ('LINEBELOW',(0,0),(-1,0),.5,GREEN),('LINEBELOW',(0,1),(-1,-1),.3,colors.HexColor('#dce5dd')),
            ])); story.extend([table,Spacer(1,10)]); continue
        if line == '### Open decisions and dependencies': story.append(PageBreak())
        level=len(line)-len(line.lstrip('#'))
        if level and line[level:level+1]==' ':
            story.append(Paragraph(inline(line[level:].strip()),styles[f'h{min(level,3)}'])); i+=1; continue
        paragraph=[line]; i+=1
        while i<len(lines) and lines[i].strip() and not lines[i].startswith(('#','|')):
            paragraph.append(lines[i].strip()); i+=1
        story.append(Paragraph(inline(' '.join(paragraph)),styles['body']))
    DEST.parent.mkdir(parents=True,exist_ok=True)
    doc=SimpleDocTemplate(str(DEST),pagesize=A4,rightMargin=44,leftMargin=44,topMargin=49,bottomMargin=54,
      title='Tennora Table Tennis League - Revised Technical Requirements',author='Tennora; based on source attributed to @kelliosli',pageCompression=1)
    doc.build(story,canvasmaker=PageCanvas)
    print(f'Built {DEST.relative_to(ROOT)}')

if __name__=='__main__': build()
