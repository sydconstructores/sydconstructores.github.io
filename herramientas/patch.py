import re
import json

Z1_tasks = [
    'A01 Preliminares', 'A02 Demoliciones', 'A03 Zapatas aisladas', 'A03 Zapatas aisladas', 
    'A04 Zapatas corridas', 'A04 Zapatas corridas', 'A05 Albañilerías', 'A05 Albañilerías',
    'A06 Estructura de Acero', 'A06 Estructura de Acero', 'A06 Estructura de Acero', 'A06 Estructura de Acero',
    'A07 Losa aligerada', 'A07 Losa aligerada', 'A08 Durock en cubierta', 'A08 Durock en cubierta',
    'A09 Instalación Eléctrica', 'A09 Instalación Eléctrica', 'A09 Accesorios Eléctricos', 'A09 Tableros/Interrupt.',
    'A10 Inst. Hidráulicas', 'A10 Inst. Hidráulicas', 'A10 Inst. Sanitarias', 'A10 Inst. Sanitarias',
    'A10 Inst. Pluviales', 'A10 Inst. Pluviales', 'A11 Recubrimi./Pintura', 'A11 Recubrimi./Pintura',
    'A12 Herrería', 'A12 Herrería', 'A12 Herrería', 'A13 Limpieza'
]

Z2_tasks = [
    'F01 Preliminares', 'F02 Desmontajes', 'F03 Demoliciones', 'F04 Zapata corrida',
    'F04 Zapata corrida', 'F05 Albañilerías', 'F05 Albañilerías', 'F05 Albañilerías',
    'F06 Losa aligerada', 'F06 Losa aligerada', 'H01 Desmontaje', 'H02 Estructura Acero',
    'H02 Estructura Acero', 'H03 Durock Cubierta', 'F07 Inst. Eléctricas', 'F07 Inst. Eléctricas',
    'F07 Accesorios Eléctr.', 'F07 Tablero/Interrupt.', 'F08 Inst. Hidráulicas', 'F08 Inst. Sanitarias',
    'F08 Inst. Pluviales', 'F08 Inst. Pluviales', 'F08 Accesorios Sanit.', 'F08 Accesorios Sanit.',
    'F09 Recubrim./Pintura', 'F09 Recubrim./Pintura', 'F10 Cancelería', 'F10 Cancelería',
    'F11 Carpintería', 'F11 Carpintería', 'F12 Lambrín WPC', 'F13 Limpieza'
]

Z3_tasks = [
    'B01/C01 Preliminar.', 'B02 Desmontajes', 'B03 Demoliciones', 'B04 Zapata Corrida',
    'B05 Losa Rampa', 'B06 Albañilerías', 'C02 Albañilerías', 'C02 Albañilerías',
    'C03 Losa Aligerada', 'C03 Losa Aligerada', 'C04 Inst. Eléctricas', 'B07 Inst. Eléctricas',
    'C04 Inst. Eléctricas', 'C04 Accesori. Eléct.', 'B07 Accesori. Eléct.', 'C04 Tablero',
    'C05 Inst. Pluviales', 'C05 Inst. Pluviales', 'C06 Voz y Datos', 'B08 Recubrim./Pint.',
    'C07 Recubrim./Pint.', 'C07 Recubrim./Pint.', 'B09 Cancelería', 'B09 Cancelería',
    'C08 Cancelería', 'C08 Cancelería', 'B10 Lambrín WPC', 'B10 Lambrín WPC',
    'Detalle Lambrín', 'Ajustes finales', 'B11 Limpieza', 'C09 Limpieza'
]

Z4_tasks = [
    'G01 Preliminares', 'G02 Desmontajes', 'G03 Demoliciones', 'G04 Zapata corrida',
    'G04 Zapata corrida', 'G05 Albañilerías', 'G05 Albañilerías', 'G06 Losa aligerada',
    'G06 Losa aligerada', 'H01 Desmontaje', 'H02 Estructura Acero', 'H03 Durock Cubierta',
    'G07 Inst. Eléctricas', 'G07 Inst. Eléctricas', 'G07 Accesorios Eléc.', 'G07 Tablero',
    'G08 Inst. Hidráulicas', 'G08 Inst. Sanitarias', 'G08 Inst. Pluviales', 'G08 Inst. Pluviales',
    'G08 Accesorios San.', 'G09 Recubrim./Pint.', 'G09 Recubrim./Pint.', 'G09 Recubrim./Pint.',
    'G10 Cancelería', 'G10 Cancelería', 'G11 Carpintería', 'G11 Carpintería',
    'Adecuaciones', 'Pruebas generales', 'Retiro material', 'G12 Limpieza'
]

Z5_tasks = [
    'D01/E01 Prelimina.', 'D02 Desmontajes', 'D03 Demoliciones', 'D04 Zapatas Aisladas',
    'D05 Zapatas Corridas', 'D06 Albañilerías', 'E02 Albañilerías', 'E02 Albañilerías',
    'D07 Losa Aligerada', 'E03 Losa Aligerada', 'E03 Losa Aligerada', 'D08 Inst. Eléctricas',
    'E04 Inst. Eléctricas', 'E04 Accesori. Eléct.', 'D08 Acce./Tablero', 'E04 Tablero',
    'E05 Inst. Pluviales', 'E05 Inst. Pluviales', 'E06 Voz y Datos', 'D09 Recubrim./Pint.',
    'E07 Recubrim./Pint.', 'E07 Recubrim./Pint.', 'D10 Cancelería', 'E08 Cancelería',
    'E08 Cancelería', 'D11 Lambrín WPC', 'E09 Lambrín WPC', 'E09 Lambrín WPC',
    'D12 Herrería', 'D12 Herrería', 'D13 Limpieza', 'E10 Limpieza'
]

def make_details(tasks):
    return [(t, f'Ejecución correspondiente a la partida {t} de acuerdo con el catálogo de conceptos del presupuesto y especificaciones constructivas.') for t in tasks]

ZONES = [
    {'zone': 'Zona 1: Cochera', 'emoji': '🏠', 'tasks': Z1_tasks, 'details': make_details(Z1_tasks)},
    {'zone': 'Zona 2: Baño Ppal', 'emoji': '🚿', 'tasks': Z2_tasks, 'details': make_details(Z2_tasks)},
    {'zone': 'Zona 3: Recámara 2', 'emoji': '🛏', 'tasks': Z3_tasks, 'details': make_details(Z3_tasks)},
    {'zone': 'Zona 4: Recámara 1', 'emoji': '🛏', 'tasks': Z4_tasks, 'details': make_details(Z4_tasks)},
    {'zone': 'Zona 5: Sala TV', 'emoji': '📺', 'tasks': Z5_tasks, 'details': make_details(Z5_tasks)},
]

code = 'ZONES = [\n'
for z in ZONES:
    code += f'  {{\n    "zone": "{z["zone"]}", "emoji": "{z["emoji"]}",\n    "tasks": {json.dumps(z["tasks"], ensure_ascii=False)},\n    "details": [\n'
    for d in z['details']:
        code += f'      {json.dumps(d, ensure_ascii=False)},\n'
    code += '    ]\n  },\n'
code += ']\n\nif __name__ == "__main__":'

with open('expand_gantt.py', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(r'ZONES = \[.*?if __name__ == [\'"]__main__[\'"]:', code, text, flags=re.DOTALL)

with open('expand_gantt.py', 'w', encoding='utf-8') as f:
    f.write(text)

print('expand_gantt.py updated!')
