import os
import re

files_to_patch = {
    'gen_qr.py': [
        (r"out = r'e:\\NEGOCIO\\GUADALAJARA\\Learning Hero\\Nueva carpeta\\QR_SYD_Constructores.png'", 
         r"out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'QR_SYD_Constructores.png')")
    ],
    'generar_pdf.py': [
        (r'sys\.path\.insert\(0, r"e:\\NEGOCIO\\GUADALAJARA\\Learning Hero\\Nueva carpeta"\)',
         r"sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))"),
        (r'src_py = r"e:\\NEGOCIO\\GUADALAJARA\\Learning Hero\\Nueva carpeta\\expand_gantt.py"',
         r"src_py = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'expand_gantt.py')"),
        (r'OUT = r"e:\\NEGOCIO\\GUADALAJARA\\Learning Hero\\Nueva carpeta\\Cronograma_Sauces_32sem.pdf"',
         r"OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Cronograma_Sauces_32sem.pdf')")
    ],
    'generar_excel_mpp.py': [
        (r'sys\.path\.insert\(0, r"e:\\NEGOCIO\\GUADALAJARA\\Learning Hero\\Nueva carpeta"\)',
         r"sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))")
    ],
    'generar_cronograma.py': [
        (r'out = r"e:\\NEGOCIO\\GUADALAJARA\\Learning Hero\\Nueva carpeta\\Cronograma_Sauces.docx"',
         r"out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Cronograma_Sauces.docx')")
    ],
    'expand_gantt.py': [
        (r'src = r"e:\\NEGOCIO\\GUADALAJARA\\Learning Hero\\Nueva carpeta\\gantt_mobile.html"',
         r"src = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gantt_mobile.html')")
    ]
}

def add_import_os_if_needed(content):
    if 'import os' not in content:
        return 'import os\n' + content
    return content

for filename, patches in files_to_patch.items():
    if not os.path.exists(filename): continue
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = add_import_os_if_needed(content)
    
    for old, new in patches:
        content = re.sub(old, new, content)
        
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Patched {filename}')
