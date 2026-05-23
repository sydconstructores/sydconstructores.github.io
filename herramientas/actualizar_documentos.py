import os
import json
import glob
import subprocess
import sys

# Forzar UTF-8 en la consola de Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Directorio raíz del proyecto (donde está index.html)
PROJECT_DIR = r"e:\NEGOCIO\GUADALAJARA\PROYECTOS\Aplicacion SYD"
OBRAS_DIR = os.path.join(PROJECT_DIR, "obras")

# Extensiones soportadas
EXTENSIONES = ["*.pdf", "*.PDF", "*.doc", "*.docx", "*.xlsx", "*.xls", "*.jpg", "*.jpeg", "*.png"]

def update_documentos():
    if not os.path.exists(OBRAS_DIR):
        print(f"❌ Error: No se encontró el directorio '{OBRAS_DIR}'")
        return False

    total_docs = 0
    archivos_a_subir = []

    for obra_folder in os.listdir(OBRAS_DIR):
        obra_path = os.path.join(OBRAS_DIR, obra_folder)
        
        if not os.path.isdir(obra_path):
            continue
            
        data_json_path = os.path.join(obra_path, "data.json")
        docs_folder_path = os.path.join(obra_path, "Documentos")
        
        if not os.path.exists(data_json_path):
            print(f"  ⏭️  Saltando {obra_folder}: No tiene data.json")
            continue
            
        # Leer el JSON actual
        try:
            with open(data_json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            print(f"  ❌ Error leyendo {data_json_path}: {e}")
            continue
            
        documentos = []
        
        # Buscar archivos en la carpeta Documentos
        if os.path.exists(docs_folder_path) and os.path.isdir(docs_folder_path):
            seen = set()  # Evitar duplicados en Windows (case-insensitive)
            for ext in EXTENSIONES:
                for archivo in glob.glob(os.path.join(docs_folder_path, ext)):
                    filename = os.path.basename(archivo)
                    key = filename.lower()
                    if key in seen:
                        continue
                    seen.add(key)
                    relative_path = f"obras/{obra_folder}/Documentos/{filename}"
                    documentos.append({
                        "nombre": filename,
                        "ruta": relative_path
                    })
                    archivos_a_subir.append(archivo)
        
        # Actualizar el json
        data["documentos"] = documentos
        
        try:
            with open(data_json_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"  ✅ {obra_folder}: {len(documentos)} documento(s)")
            for doc in documentos:
                print(f"       📄 {doc['nombre']}")
            total_docs += len(documentos)
            archivos_a_subir.append(data_json_path)
        except Exception as e:
            print(f"  ❌ Error guardando {data_json_path}: {e}")
    
    print(f"\n📊 Total: {total_docs} documento(s) en todas las obras")
    return True

def subir_a_github():
    """Hace git add, commit y push de los documentos y data.json actualizados"""
    print("\n🚀 Subiendo cambios a GitHub...")
    
    try:
        # 1. Git add de toda la carpeta obras (documentos + data.json)
        result = subprocess.run(
            ["git", "add", "obras/"],
            cwd=PROJECT_DIR, capture_output=True, text=True
        )
        if result.returncode != 0:
            print(f"  ❌ Error en git add: {result.stderr}")
            return False
        
        # 2. Verificar si hay cambios para commitear
        status = subprocess.run(
            ["git", "status", "--porcelain", "obras/"],
            cwd=PROJECT_DIR, capture_output=True, text=True
        )
        
        if not status.stdout.strip():
            print("  ℹ️  No hay cambios nuevos que subir. Todo está actualizado.")
            return True
        
        # Mostrar qué archivos se van a subir
        print("  📦 Archivos a subir:")
        for line in status.stdout.strip().split("\n"):
            print(f"       {line.strip()}")
        
        # 3. Git commit
        result = subprocess.run(
            ["git", "commit", "-m", "Actualizar documentos de obras"],
            cwd=PROJECT_DIR, capture_output=True, text=True
        )
        if result.returncode != 0:
            print(f"  ❌ Error en git commit: {result.stderr}")
            return False
        print("  ✅ Commit realizado")
        
        # 4. Git push
        result = subprocess.run(
            ["git", "push"],
            cwd=PROJECT_DIR, capture_output=True, text=True, timeout=60
        )
        if result.returncode != 0:
            print(f"  ❌ Error en git push: {result.stderr}")
            return False
        print("  ✅ Push completado — ¡Documentos disponibles en la app!")
        
        return True
        
    except subprocess.TimeoutExpired:
        print("  ❌ Timeout: El push tardó demasiado. Verifica tu conexión.")
        return False
    except Exception as e:
        print(f"  ❌ Error inesperado: {e}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("  📁 ACTUALIZAR DOCUMENTOS — SYD Constructores")
    print("=" * 50)
    print()
    
    # Paso 1: Escanear y actualizar data.json
    print("1️⃣  Escaneando carpetas de Documentos...")
    if update_documentos():
        # Paso 2: Subir a GitHub
        print()
        print("2️⃣  Subiendo a GitHub Pages...")
        if subir_a_github():
            print()
            print("=" * 50)
            print("  ✅ ¡LISTO! Los documentos ya están en la app.")
            print("=" * 50)
        else:
            print()
            print("⚠️  Los data.json se actualizaron localmente pero")
            print("    no se pudieron subir a GitHub.")
    else:
        print("❌ Error durante la actualización.")
