import os
import json

# ── Configuración de Rutas ──────────────────────────────────────────────────
# La App Central está en la carpeta actual (no migrada)
APP_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(APP_DIR, "database", "sauces.json")

# ── Datos de la Obra Sauces ─────────────────────────────────────────────────
# (Estos datos son los que se sincronizaron previamente con el PDF)

ZONES = [
  {
    "zone": "Zona 1: Cochera", "emoji": "🏠",
    "tasks": ["", "A01 Preliminares, Demoliciones", "A01 Preliminares, Demoliciones", "A03 Zapatas aisladas, Zapatas corridas", "A05 Albañilerías", "A05 Albañilerías", "A06 Estructura de Acero", "A06 Estructura de Acero", "A07 Losa aligerada", "A07 Losa aligerada", "A08 Durock en cubierta", "A09 Instalación Eléctrica", "A09 Tableros/Interrupt.", "A10 Inst. Pluviales", "A11 Recubrimi./Pintura", "A12 Herrería", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    "details": [
      ["S/A", "Sin actividad programada para esta semana."],
      ["A01 Preliminares, Demoliciones", "Trazo, nivelación y limpieza de área; demolición de elementos existentes según proyecto."],
      ["A01 Preliminares, Demoliciones", "Trazo, nivelación y limpieza de área; demolición de elementos existentes según proyecto."],
      ["A03 Zapatas aisladas, Zapatas corridas", "Excavación y habilitado de acero para zapatas aisladas y corridas en zona de garage."],
      ["A05 Albañilerías", "Desplante de muros de block con castillos de refuerzo y cerramientos estructurales."],
      ["A05 Albañilerías", "Desplante de muros de block con castillos de refuerzo y cerramientos estructurales."],
      ["A06 Estructura de Acero", "Suministro y montaje de estructura metálica de soporte para cubierta de cochera."],
      ["A06 Estructura de Acero", "Suministro y montaje de estructura metálica de soporte para cubierta de cochera."],
      ["A07 Losa aligerada", "Cimbrado y colado de losa aligerada con casetón de poliestireno y malla electrosoldada."],
      ["A07 Losa aligerada", "Cimbrado y colado de losa aligerada con casetón de poliestireno y malla electrosoldada."],
      ["A08 Durock en cubierta", "Instalación de sistema de techumbre con paneles de cemento Durock y sellado."],
      ["A09 Instalación Eléctrica", "Canalización de tubería conduit, cableado y colocación de accesorios y tableros."],
      ["A09 Tableros/Interrupt.", "Canalización de tubería conduit, cableado y colocación de accesorios y tableros."],
      ["A10 Inst. Pluviales", "Instalación de bajadas pluviales y conexión a red de drenaje existente."],
      ["A11 Recubrimi./Pintura", "Aplicación de recubrimientos, aplanados y pintura vinílica en muros y plafones."],
      ["A12 Herrería", "Suministro e instalación de portón y elementos de herrería ornamental."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."]
    ]
  },
  {
    "zone": "Zona 2: Baño Ppal", "emoji": "🚿",
    "tasks": ["", "", "", "", "", "", "", "", "", "", "F01 Preliminares, Desmontajes", "F01 Preliminares, Desmontajes", "F04 Zapata corrida", "F05 Albañilerías", "F06 Losa aligerada, Desmontaje", "H02 Estructura Acero", "H03 Durock Cubierta", "F07 Inst. Eléctricas, Tablero", "F08 Inst. Hidráulicas, Sanitarias, Pluviales", "F08 Accesorios Sanit.", "F09 Recubrim./Pintura", "F10 Cancelería", "F12 Lambrín WPC", "", "", "", "", "", "", "", "", ""],
    "details": [
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["F01 Preliminares, Desmontajes", "Protección de áreas existentes y desmontaje de muebles y accesorios de baño."],
      ["F01 Preliminares, Desmontajes", "Protección de áreas existentes y desmontaje de muebles y accesorios de baño."],
      ["F04 Zapata corrida", "Refuerzo estructural mediante zapatas corridas para ampliación de vestidor."],
      ["F05 Albañilerías", "Levantamiento de muros y adecuación de espacios para vestidor y baño principal."],
      ["F06 Losa aligerada, Desmontaje", "Colado de losa de entrepiso y ajustes por demolición de elementos previos."],
      ["H02 Estructura Acero", "Estructura de soporte para pérgola metálica en zona de baño/terraza."],
      ["H03 Durock Cubierta", "Instalación de sistema de techumbre con paneles de cemento Durock y sellado."],
      ["F07 Inst. Eléctricas, Tablero", "Instalación de puntos de luz, contactos y tablero de control eléctrico."],
      ["F08 Inst. Hidráulicas, Sanitarias, Pluviales", "Suministro e instalación de tuberías para agua, drenaje y pluviales; colocación de accesorios."],
      ["F08 Accesorios Sanit.", "Suministro e instalación de tuberías para agua, drenaje y pluviales; colocación de accesorios."],
      ["F09 Recubrim./Pintura", "Colocación de azulejos, pisos cerámicos y acabados finales en pintura."],
      ["F10 Cancelería", "Instalación de canceles de baño en cristal templado y marcos de aluminio."],
      ["F12 Lambrín WPC", "Instalación de revestimiento decorativo tipo Lambrín WPC en muros de acento."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."]
    ]
  },
  {
    "zone": "Zona 3: Recámara 2", "emoji": "🛏",
    "tasks": ["", "", "", "", "", "", "", "", "B01/C01 Preliminar. B02, B03", "B01/C01 Preliminar. B02, B03", "B01/C01 Preliminar. B02, B03", "B04 Zapata Corrida, B05", "B06 Albañilerías", "C02 Albañilerías", "C02 Albañilerías", "C03 Losa Aligerada", "C03 Losa Aligerada", "C04 Inst. Eléctricas", "B07 Inst. Eléctricas", "C04 Inst. Eléctricas", "C04 Accesorios Eléct.", "B07 Accesorios Eléct.", "C04 Tablero", "C05 Inst. Pluviales", "C05 Inst. Pluviales", "C06 Voz y Datos", "B08 Recubrim./Pint.", "C07 Recubrim./Pintura", "C07 Recubrim./Pintura", "B09 Cancelería", "B09 Cancelería", "B10 Lambrín WPC / C09 Limpieza"],
    "details": [
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["B01/C01 Preliminar. B02, B03", "Trabajos preliminares y desmontaje de elementos en escaleras y estudio."],
      ["B01/C01 Preliminar. B02, B03", "Trabajos preliminares y desmontaje de elementos en escaleras y estudio."],
      ["B01/C01 Preliminar. B02, B03", "Trabajos preliminares y desmontaje de elementos en escaleras y estudio."],
      ["B04 Zapata Corrida, B05", "Cimentación de escalera mediante zapata corrida y preparación de rampa."],
      ["B06 Albañilerías", "Construcción de muros y preparación de superficies en zona de escaleras."],
      ["C02 Albañilerías", "Albañilerías generales y adecuación de vanos en área de estudio."],
      ["C02 Albañilerías", "Albañilerías generales y adecuación de vanos en área de estudio."],
      ["C03 Losa Aligerada", "Losa aligerada en estudio I para cierre de niveles superiores."],
      ["C03 Losa Aligerada", "Losa aligerada en estudio I para cierre de niveles superiores."],
      ["C04 Inst. Eléctricas", "Instalación eléctrica completa, incluyendo accesorios y tablero de distribución."],
      ["B07 Inst. Eléctricas", "Puntos eléctricos específicos para iluminación de escalera y estudio."],
      ["C04 Inst. Eléctricas", "Instalación eléctrica completa, incluyendo accesorios y tablero de distribución."],
      ["C04 Accesorios Eléct.", "Instalación eléctrica completa, incluyendo accesorios y tablero de distribución."],
      ["B07 Accesorios Eléct.", "Puntos eléctricos específicos para iluminación de escalera y estudio."],
      ["C04 Tablero", "Instalación eléctrica completa, incluyendo accesorios y tablero de distribución."],
      ["C05 Inst. Pluviales", "Sistema de captación pluvial en azotea de estudio."],
      ["C05 Inst. Pluviales", "Sistema de captación pluvial en azotea de estudio."],
      ["C06 Voz y Datos", "Canalización y cableado para red de voz y datos (internet/telefonía)."],
      ["B08 Recubrim./Pint.", "Acabados en muros de escalera y pintura general."],
      ["C07 Recubrim./Pintura", "Aplanados y pintura en estudio I."],
      ["C07 Recubrim./Pintura", "Aplanados y pintura en estudio I."],
      ["B09 Cancelería", "Ventanas y puertas de aluminio en zona de escaleras."],
      ["B09 Cancelería", "Ventanas y puertas de aluminio en zona de escaleras."],
      ["B10 Lambrín WPC / C09 Limpieza", "Detalles decorativos con Lambrín WPC en muros de escalera."]
    ]
  },
  {
    "zone": "Zona 4: Recámara 1", "emoji": "🛏",
    "tasks": ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "G01 Preliminares, Desmontajes", "G03 Demoliciones", "G04 Zapata corrida", "G05 Albañilerías", "G06 Losa aligerada", "H01 Desmontaje, Estructura Acero", "H03 Durock Cubierta", "G07 Inst. Eléctricas", "G08 Inst. Hidráulicas/Sanitarias/Pluviales", "G08 Inst. Hidráulicas/Sanitarias/Pluviales", "G08 Inst. Hidráulicas/Sanitarias/Pluviales", "G08 Inst. Hidráulicas/Sanitarias/Pluviales", "G09 Recubrim./Pint.", "G10 Cancelería", "G11 Carpintería Adecuaciones", "G12 Limpieza"],
    "details": [
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["G01 Preliminares, Desmontajes", "Desmontaje de áreas en recámara 1 y preparativos para remodelación."],
      ["G03 Demoliciones", "Ejecución de trabajos correspondientes a G03 Demoliciones según especificaciones de proyecto."],
      ["G04 Zapata corrida", "Cimentación para ampliación de recámara mediante zapatas corridas."],
      ["G05 Albañilerías", "Levantamiento de muros y albañilería en recámara y baño."],
      ["G06 Losa aligerada", "Losa estructural aligerada para cubierta de recámara."],
      ["H01 Desmontaje, Estructura Acero", "Desmontaje de estructuras existentes para integración de pérgolas."],
      ["H03 Durock Cubierta", "Instalación de sistema de techumbre con paneles de cemento Durock y sellado."],
      ["G07 Inst. Eléctricas", "Instalación eléctrica general en recámara y baño asociado."],
      ["G08 Inst. Hidráulicas/Sanitarias/Pluviales", "Red de agua fría/caliente, drenaje y bajadas pluviales en zona G."],
      ["G08 Inst. Hidráulicas/Sanitarias/Pluviales", "Red de agua fría/caliente, drenaje y bajadas pluviales en zona G."],
      ["G08 Inst. Hidráulicas/Sanitarias/Pluviales", "Red de agua fría/caliente, drenaje y bajadas pluviales en zona G."],
      ["G08 Inst. Hidráulicas/Sanitarias/Pluviales", "Red de agua fría/caliente, drenaje y bajadas pluviales en zona G."],
      ["G09 Recubrim./Pint.", "Acabados cerámicos en baño y pintura en recámara."],
      ["G10 Cancelería", "Cancelería de aluminio y cristal en recámara 1."],
      ["G11 Carpintería Adecuaciones", "Muebles de carpintería (closets) y adecuaciones de madera."],
      ["G12 Limpieza", "Limpieza fina de obra, retiro de excedentes y entrega de áreas listas para uso."]
    ]
  },
  {
    "zone": "Zona 5: Sala TV", "emoji": "📺",
    "tasks": ["", "", "", "", "", "", "", "", "", "", "", "D01/E01 Prelimina. Desmontajes. Demoliciones", "D01/E01 Prelimina. Desmontajes. Demoliciones", "D04 Zapatas Aisladas, Corridas", "D06 Albañilerías", "E02 Albañilerías", "D07 Losa Aligerada", "D07 Losa Aligerada", "D08 Inst. Eléctricas, Acce./Tablero", "E05 Inst. Pluviales", "E06 Voz y Datos", "D09 Recubrim./Pint.", "E08 Cancelería", "D11 Lambrín WPC", "D12 Herrería", "E10 Limpieza", "", "", "", "", "", ""],
    "details": [
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["D01/E01 Prelimina. Desmontajes. Demoliciones", "Preliminares y demoliciones en área de sala de TV y estudio II."],
      ["D01/E01 Prelimina. Desmontajes. Demoliciones", "Preliminares y demoliciones en área de sala de TV y estudio II."],
      ["D04 Zapatas Aisladas, Corridas", "Cimentación mixta (aisladas/corridas) para soporte de nueva estructura."],
      ["D06 Albañilerías", "Muros de block y cerramientos en sala de TV."],
      ["E02 Albañilerías", "Albañilerías específicas para estudio II en nivel superior."],
      ["D07 Losa Aligerada", "Losa de cubierta para sala de TV."],
      ["D07 Losa Aligerada", "Losa de cubierta para sala de TV."],
      ["D08 Inst. Eléctricas, Acce./Tablero", "Instalaciones eléctricas y accesorios en zona de entretenimiento."],
      ["E05 Inst. Pluviales", "Canalización pluvial en estudio II."],
      ["E06 Voz y Datos", "Instalación de red de voz y datos para oficina/estudio."],
      ["D09 Recubrim./Pint.", "Pintura y acabados decorativos en sala de TV."],
      ["E08 Cancelería", "Ventanas de gran formato en estudio II."],
      ["D11 Lambrín WPC", "Revestimiento de muros con paneles WPC."],
      ["D12 Herrería", "Trabajos de herrería fina y barandales."],
      ["E10 Limpieza", "Limpieza fina de obra, retiro de excedentes y entrega de áreas listas para uso."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."],
      ["S/A", "Sin actividad programada para esta semana."]
    ]
  }
]

if __name__ == "__main__":
    # ── Cargar progreso actual si existe el archivo ──────────────────────────
    current_progress = [[0]*32 for _ in range(len(ZONES))]
    if os.path.exists(DB_FILE):
        with open(DB_FILE, "r", encoding="utf-8") as f:
            old_data = json.load(f)
            for i, zone in enumerate(old_data.get("zones", [])):
                if i < len(current_progress):
                    current_progress[i] = zone.get("progress", [0]*32)

    # ── Preparar estructura JSON final ───────────────────────────────────────
    final_zones = []
    for i, z in enumerate(ZONES):
        # Convertir details de lista a objetos
        details_obj = []
        for t, d in z["details"]:
            details_obj.append({"title": t, "desc": d})
        
        final_zones.append({
            "zone": z["zone"],
            "emoji": z["emoji"],
            "tasks": z["tasks"],
            "details": details_obj,
            "progress": current_progress[i]
        })

    full_data = {
        "obra_id": "sauces",
        "obra_name": "Residencial Los Sauces",
        "obra_sub": "Remodelación Casa Sauces",
        "hero_img": "assets/obra_sauces.jpg",
        "zones": final_zones
    }

    # ── Escribir a la base de datos de la App ────────────────────────────────
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(full_data, f, ensure_ascii=False, indent=2)

    print(f"DONE: Datos de obra 'Sauces' exportados a: {DB_FILE}")
