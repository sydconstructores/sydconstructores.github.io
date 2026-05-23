import os
"""
Generador de PDF - Cronograma Sauces 32 Semanas
Pagina 2 en LANDSCAPE, resto en PORTRAIT
Requiere: pip install reportlab
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ── Load ZONES data ────────────────────────────────────────────────────────
src_py = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'expand_gantt.py')
with open(src_py, encoding='utf-8') as f:
    code = f.read()
idx = code.find("if __name__")
if idx == -1:
    idx = code.find("# ── Read the template")
ns = {}
exec(code[:idx], ns)
ZONES = ns['ZONES']

from reportlab.lib.pagesizes import A4, landscape as LS
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.platypus import (BaseDocTemplate, Frame, PageTemplate,
                                 NextPageTemplate, PageBreak,
                                 Table, TableStyle, Paragraph, Spacer,
                                 HRFlowable)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT

# ── Colors ─────────────────────────────────────────────────────────────────
C_DARK     = HexColor('#0f172a')
C_BLUE     = HexColor('#1e3a5f')
C_BLUE_ACC = HexColor('#3b82f6')
C_AMBER    = HexColor('#f59e0b')
C_GREEN    = HexColor('#10b981')
C_GRAY_BG  = HexColor('#f8fafc')
C_GRAY_BG2 = HexColor('#e2e8f0')
C_HEADER   = HexColor('#1e3a5f')

ZONE_COLORS = [HexColor('#3b82f6'), HexColor('#8b5cf6'),
               HexColor('#10b981'), HexColor('#f59e0b'), HexColor('#ef4444')]
ZONE_BG     = [HexColor('#eff6ff'), HexColor('#f5f3ff'),
               HexColor('#ecfdf5'), HexColor('#fffbeb'), HexColor('#fef2f2')]

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Cronograma_Sauces_32sem.pdf')

# ── Dimensions ─────────────────────────────────────────────────────────────
# Portrait A4
PW, PH = A4                         # 595.3 x 841.9 pt
PM_L, PM_R, PM_T, PM_B = 18*mm, 18*mm, 16*mm, 18*mm
P_BODY_W = PW - PM_L - PM_R        # ~559 pt = 197mm

# Landscape A4
LW, LH = LS(A4)                     # 841.9 x 595.3 pt
LM_L, LM_R, LM_T, LM_B = 12*mm, 12*mm, 14*mm, 14*mm
L_BODY_W = LW - LM_L - LM_R        # ~818 pt = 289mm

# ── Styles ─────────────────────────────────────────────────────────────────
def sty(name, **kw):
    return ParagraphStyle(name, **kw)

sH1    = sty('sH1',  fontName='Helvetica-Bold', fontSize=17, leading=21,
             textColor=C_BLUE_ACC, spaceBefore=8, spaceAfter=5)
sH2    = sty('sH2',  fontName='Helvetica-Bold', fontSize=13, leading=17,
             textColor=C_DARK,     spaceBefore=8, spaceAfter=4)
sBody  = sty('sBody',fontName='Helvetica',      fontSize=9,  leading=13,
             textColor=HexColor('#334155'))
sNote  = sty('sNote',fontName='Helvetica-Oblique', fontSize=8, leading=11,
             textColor=HexColor('#64748b'))
sFoot  = sty('sFoot',fontName='Helvetica', fontSize=7.5, leading=10,
             textColor=HexColor('#94a3b8'), alignment=TA_CENTER)
sTitle = sty('sTitle',fontName='Helvetica-Bold', fontSize=21, leading=25,
             textColor=C_DARK, spaceAfter=5)
sSub   = sty('sSub',  fontName='Helvetica', fontSize=11, leading=15,
             textColor=HexColor('#475569'), spaceAfter=10)

def cell(txt, color=C_DARK, bg=None, bold=False, sz=7, align=TA_CENTER):
    fn = 'Helvetica-Bold' if bold else 'Helvetica'
    return ParagraphStyle(f'c_{txt[:4]}', fontName=fn, fontSize=sz,
                          leading=sz+2, textColor=color, alignment=align)

# shorthand cell factories
def CP(t, bold=False, sz=7, color=C_DARK, align=TA_CENTER):
    fn = 'Helvetica-Bold' if bold else 'Helvetica'
    return Paragraph(t, ParagraphStyle('cp', fontName=fn, fontSize=sz,
                     leading=sz+1.5, textColor=color, alignment=align))

# ── Page templates ──────────────────────────────────────────────────────────
portrait_frame = Frame(PM_L, PM_B, PW-PM_L-PM_R, PH-PM_T-PM_B,
                       id='portrait_frame', showBoundary=0)
landscape_frame = Frame(LM_L, LM_B, LW-LM_L-LM_R, LH-LM_T-LM_B,
                        id='landscape_frame', showBoundary=0)

def footer_portrait(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 7.5)
    canvas.setFillColor(HexColor('#94a3b8'))
    canvas.drawCentredString(PW/2, 9*mm,
        f'Cronograma Maestro SAUCES  ·  5 Zonas · 32 Semanas  ·  Página {doc.page}')
    canvas.restoreState()

def footer_landscape(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 7.5)
    canvas.setFillColor(HexColor('#94a3b8'))
    canvas.drawCentredString(LW/2, 9*mm,
        f'Cronograma Maestro SAUCES  ·  Diagrama Gantt 32 Semanas  ·  Página {doc.page}')
    canvas.restoreState()

pt_portrait   = PageTemplate(id='PT',  frames=[portrait_frame],  pagesize=A4,    onPage=footer_portrait)
pt_landscape  = PageTemplate(id='LS',  frames=[landscape_frame], pagesize=LS(A4),onPage=footer_landscape)

doc = BaseDocTemplate(
    OUT,
    pageTemplates=[pt_portrait, pt_landscape],
    title='Cronograma Maestro Sauces 32 Semanas',
    author='Construcciones Sauces',
)

elements = []

# ══════════════════════════════════════════════════════════════════════════════
# PAGE 1: PORTADA (portrait)
# ══════════════════════════════════════════════════════════════════════════════
elements.append(Spacer(1, 25*mm))
elements.append(Paragraph('CRONOGRAMA MAESTRO', sTitle))
elements.append(Paragraph('AMPLIACIÓN SAUCES  ·  5 Zonas  ·  32 Semanas  (8 Meses)', sSub))
elements.append(HRFlowable(width='100%', thickness=2, color=C_BLUE_ACC, spaceAfter=8))
elements.append(Spacer(1, 5*mm))

# Summary table
cover_rows = [[
    CP('<b>Z</b>', bold=True, sz=8, color=white),
    CP('<b>Zona</b>', bold=True, sz=8, color=white),
    CP('<b>Subtareas</b>', bold=True, sz=8, color=white),
    CP('<b>Inicio</b>', bold=True, sz=8, color=white),
    CP('<b>Entrega</b>', bold=True, sz=8, color=white),
]]
for i, z in enumerate(ZONES):
    cover_rows.append([
        CP(f'<b>Z{i+1}</b>', bold=True, sz=9, color=ZONE_COLORS[i]),
        CP(z['zone'], sz=9),
        CP('<b>32</b>', bold=True, sz=9),
        CP('Sem 01', sz=9),
        CP('Sem 32', sz=9),
    ])
cover_rows.append([
    CP('<b>—</b>', bold=True, sz=9),
    CP('<b>TOTAL PROYECTO</b>', bold=True, sz=9),
    CP('<b>160</b>', bold=True, sz=9, color=C_BLUE_ACC),
    CP('Sem 01', sz=9),
    CP('Sem 32', sz=9),
])
cws_cov = [14*mm, 80*mm, 30*mm, 25*mm, 25*mm]
ct = Table(cover_rows, colWidths=cws_cov, repeatRows=1)
ct.setStyle(TableStyle([
    ('BACKGROUND',    (0,0),(-1,0),  C_HEADER),
    ('BACKGROUND',    (0,-1),(-1,-1),C_GRAY_BG2),
    ('ROWBACKGROUNDS',(0,1),(-1,-2), [white, C_GRAY_BG]),
    ('GRID',          (0,0),(-1,-1), 0.4, HexColor('#cbd5e1')),
    ('VALIGN',        (0,0),(-1,-1), 'MIDDLE'),
    ('TOPPADDING',    (0,0),(-1,-1), 5),
    ('BOTTOMPADDING', (0,0),(-1,-1), 5),
    ('LEFTPADDING',   (0,0),(-1,-1), 5),
]))
for i in range(len(ZONES)):
    ct.setStyle(TableStyle([('LINEBEFORE',(0,i+1),(0,i+1),3,ZONE_COLORS[i])]))
elements.append(ct)
elements.append(Spacer(1, 8*mm))
elements.append(Paragraph(
    'Este documento describe con detalle técnico todas las actividades de la obra, '
    'distribuidas en 32 semanas de trabajo continuo. En la Sección 2 encontrará el '
    'diagrama Gantt general y en la Sección 3 las especificaciones completas por zona.',
    sBody))

# ── Switch to LANDSCAPE for Gantt ─────────────────────────────────────────
elements.append(NextPageTemplate('LS'))
elements.append(PageBreak())

# ══════════════════════════════════════════════════════════════════════════════
# PAGE 2: GANTT (landscape A4)
# ══════════════════════════════════════════════════════════════════════════════
# L_BODY_W = 818 pt ≈ 289mm
ZoneW  = 60*mm                        # zone label column
WeekW  = (L_BODY_W - ZoneW) / 32      # each week column ≈ 7mm

elements.append(Paragraph('DIAGRAMA GANTT GENERAL — 32 SEMANAS', sH1))
elements.append(Spacer(1, 2*mm))

# ── Build month header (8 months × 4 weeks) ────────────────────────────────
mhdr = [CP('', sz=6)]
months = ['MES 1','MES 2','MES 3','MES 4','MES 5','MES 6','MES 7','MES 8']
for m in months:
    mhdr.append(CP(f'<b>{m}</b>', bold=True, sz=6, color=white))
    mhdr.extend([CP('', sz=5)]*3)   # 3 blank cols to fill the span

# Week header
whdr = [CP('<b>ZONA / ACTIVIDAD</b>', bold=True, sz=7, color=white, align=TA_LEFT)]
for i in range(1, 33):
    whdr.append(CP(f'<b>S{i:02d}</b>', bold=True, sz=6, color=white))

gantt_rows = [mhdr, whdr]

for zi, z in enumerate(ZONES):
    row = [CP(f'<b>Z{zi+1} · {z["zone"]}</b>', bold=True, sz=7,
              color=ZONE_COLORS[zi], align=TA_LEFT)]
    for wi, task in enumerate(z['tasks']):
        row.append(CP(task, sz=5.5, color=HexColor('#1e293b')))
    gantt_rows.append(row)

col_widths_gantt = [ZoneW] + [WeekW]*32
gt = Table(gantt_rows, colWidths=col_widths_gantt, repeatRows=2)

gs = [
    # Month header row
    ('BACKGROUND',    (0,0),(-1,0),   C_DARK),
    ('TOPPADDING',    (0,0),(-1,0),   3),
    ('BOTTOMPADDING', (0,0),(-1,0),   3),
    # Week header row
    ('BACKGROUND',    (0,1),(-1,1),   C_HEADER),
    ('TOPPADDING',    (0,1),(-1,1),   3),
    ('BOTTOMPADDING', (0,1),(-1,1),   3),
    # Data rows
    ('GRID',          (0,2),(-1,-1),  0.25, HexColor('#e2e8f0')),
    ('VALIGN',        (0,0),(-1,-1),  'MIDDLE'),
    ('TOPPADDING',    (0,2),(-1,-1),  2),
    ('BOTTOMPADDING', (0,2),(-1,-1),  2),
    ('LEFTPADDING',   (0,0),(-1,-1),  2),
    ('RIGHTPADDING',  (0,0),(-1,-1),  1),
    # Outer border
    ('BOX',           (0,0),(-1,-1),  0.8, HexColor('#94a3b8')),
]
# Zone row colors + left stripe
for i in range(len(ZONES)):
    ri = i + 2
    gs.append(('BACKGROUND', (0,ri),(-1,ri), ZONE_BG[i]))
    gs.append(('LINEBEFORE',  (0,ri),(0,ri), 3, ZONE_COLORS[i]))
    gs.append(('FONT',        (0,ri),(0,ri), 'Helvetica-Bold'))

# Month header spans (1 label + 3 blank = 4 cols each)
for m in range(8):
    sc = 1 + m*4
    ec = sc + 3
    gs.append(('SPAN',       (sc,0),(ec,0)))
    gs.append(('ALIGN',      (sc,0),(ec,0), 'CENTER'))

# Alternate week col shading for readability
for w in range(32):
    col = w + 1
    if (w // 4) % 2 == 1:   # shade alternate months lightly
        gs.append(('BACKGROUND', (col,2),(col,-1), HexColor('#f0f4ff')))

gt.setStyle(TableStyle(gs))
elements.append(gt)
elements.append(Spacer(1, 4*mm))
elements.append(Paragraph(
    'Cada columna representa una semana de construcción. Los colores por zona facilitan '
    'el seguimiento de cada área de trabajo. Las páginas siguientes detallan cada actividad.',
    sNote))

# ── Switch back to PORTRAIT ────────────────────────────────────────────────
elements.append(NextPageTemplate('PT'))
elements.append(PageBreak())

# ══════════════════════════════════════════════════════════════════════════════
# PAGES 3+: DETALLE POR ZONA (portrait)
# ══════════════════════════════════════════════════════════════════════════════
for zi, z in enumerate(ZONES):
    zcolor = ZONE_COLORS[zi]
    zbg    = ZONE_BG[zi]

    elements.append(Paragraph(f'ZONA {zi+1}: {z["zone"].upper()}', sH1))
    elements.append(HRFlowable(width='100%', thickness=2, color=zcolor, spaceAfter=5))
    elements.append(Paragraph(
        f'Especificaciones técnicas detalladas · 32 semanas · '
        f'Materiales, dimensiones y criterios de verificación incluidos.', sNote))
    elements.append(Spacer(1, 4*mm))

    # Table: Sem | Actividad | Descripcion tecnica completa
    det_hdr = [
        CP('<b>Sem</b>',   bold=True, sz=8, color=white),
        CP('<b>Subtrabajo</b>', bold=True, sz=8, color=white, align=TA_LEFT),
        CP('<b>Descripción Técnica Detallada</b>', bold=True, sz=8, color=white, align=TA_LEFT),
    ]
    det_rows = [det_hdr]
    for wi, (title, desc) in enumerate(z['details']):
        mes = (wi // 4) + 1
        det_rows.append([
            CP(f'<b>S{wi+1:02d}</b><br/>Mes {mes}', bold=True, sz=8, color=zcolor),
            Paragraph(f'<b>{title}</b>',
                      ParagraphStyle('dt', fontName='Helvetica-Bold', fontSize=9,
                                     leading=12, textColor=C_DARK)),
            Paragraph(desc,
                      ParagraphStyle('dd', fontName='Helvetica', fontSize=8.5,
                                     leading=12.5, textColor=HexColor('#334155'))),
        ])

    # Usable portrait width: P_BODY_W ≈ 559pt = 197mm
    cw_det = [16*mm, 56*mm, 125*mm]
    dt = Table(det_rows, colWidths=cw_det, repeatRows=1)
    dt.setStyle(TableStyle([
        ('BACKGROUND',    (0,0),(-1,0),  C_HEADER),
        ('ROWBACKGROUNDS',(0,1),(-1,-1), [white, zbg]),
        ('GRID',          (0,0),(-1,-1), 0.3, HexColor('#e2e8f0')),
        ('LINEBEFORE',    (0,1),(0,-1),  3,   zcolor),
        ('VALIGN',        (0,0),(-1,-1), 'TOP'),
        ('TOPPADDING',    (0,0),(-1,-1), 5),
        ('BOTTOMPADDING', (0,0),(-1,-1), 5),
        ('LEFTPADDING',   (0,0),(-1,-1), 5),
        ('BOX',           (0,0),(-1,-1), 0.8, HexColor('#94a3b8')),
    ]))
    elements.append(dt)

    if zi < len(ZONES) - 1:
        elements.append(PageBreak())

# ── SIGNATURE PAGE ─────────────────────────────────────────────────────────
elements.append(PageBreak())
elements.append(Spacer(1, 18*mm))
elements.append(Paragraph('ACTA DE ACEPTACIÓN DEL CRONOGRAMA', sH2))
elements.append(HRFlowable(width='100%', thickness=1.5, color=C_BLUE_ACC, spaceAfter=8))
elements.append(Spacer(1, 4*mm))
elements.append(Paragraph(
    'El presente Cronograma Maestro ha sido revisado y aceptado por ambas partes. '
    'Los trabajos se ejecutarán conforme a las especificaciones aquí señaladas, '
    'respetando los plazos y materiales descritos en cada actividad.', sBody))
elements.append(Spacer(1, 22*mm))

sig = [
    [CP('<b>Contratista</b>', bold=True, sz=9), CP('', sz=8), CP('<b>Cliente</b>', bold=True, sz=9)],
    [CP('_'*36, sz=9), CP('', sz=8), CP('_'*36, sz=9)],
    [CP('Nombre y Firma', sz=8), CP('', sz=8), CP('Nombre y Firma', sz=8)],
    [CP('Fecha: _______________', sz=8), CP('', sz=8), CP('Fecha: _______________', sz=8)],
]
st = Table(sig, colWidths=[75*mm, 30*mm, 75*mm])
st.setStyle(TableStyle([
    ('TOPPADDING',    (0,0),(-1,-1), 8),
    ('BOTTOMPADDING', (0,0),(-1,-1), 5),
    ('ALIGN',         (0,0),(-1,-1), 'CENTER'),
]))
elements.append(st)
elements.append(Spacer(1, 14*mm))
elements.append(HRFlowable(width='100%', thickness=0.5, color=HexColor('#cbd5e1'), spaceAfter=4))
elements.append(Paragraph(
    'Cronograma Maestro SAUCES  ·  5 Zonas  ·  32 Semanas  ·  160 Actividades documentadas',
    sNote))

# ── BUILD PDF ──────────────────────────────────────────────────────────────
doc.build(elements)
size = os.path.getsize(OUT) // 1024
print(f"PDF generado: {OUT}")
print(f"Tamanio: {size} KB")
