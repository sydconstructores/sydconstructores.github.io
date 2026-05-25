
// ══════════════════════════════════════
// PWA — Service Worker + Install Banner
// ══════════════════════════════════════
let deferredPrompt = null;

// Registrar Service Worker
if('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(r => console.log('[SYD] SW registrado:', r.scope))
        .catch(e => console.warn('[SYD] SW error:', e));
}

// Capturar evento de instalación (Android/Chrome)
window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    // Mostrar banner tras 3 segundos
    setTimeout(() => {
        if(!localStorage.getItem('syd_installed')) {
            document.getElementById('installBanner').style.display = 'block';
        }
    }, 3000);
});

document.getElementById('btnInstall').addEventListener('click', async () => {
    if(/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
        document.getElementById('iosModal').style.display = 'flex';
        return;
    }
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if(outcome === 'accepted') {
        localStorage.setItem('syd_installed','1');
        document.getElementById('installBanner').style.display = 'none';
    }
    deferredPrompt = null;
});

// Detectar iOS para mostrar el banner
if(/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream && !window.navigator.standalone) {
    setTimeout(() => {
        if(!localStorage.getItem('syd_installed')) {
            document.getElementById('installBanner').style.display = 'block';
        }
    }, 3000);
}

window.addEventListener('appinstalled', () => {
    localStorage.setItem('syd_installed','1');
    document.getElementById('installBanner').style.display = 'none';
    console.log('[SYD] App instalada ✓');
});


// SERVICE WORKER & UPDATES
const APP_VERSION = 'Beta 1.0.18';

// Auto-fill all version placeholders
function fillVersionBadges() {
    document.getElementById('versionBadge').textContent = APP_VERSION;
    document.querySelectorAll('.version-auto').forEach(el => {
        el.textContent = APP_VERSION;
    });
}
// Run immediately since script loads after DOM
fillVersionBadges();

let newWorker;
let swRegistration = null;

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(reg => {
            console.log('[SYD] Service Worker Registrado');
            swRegistration = reg;

            reg.addEventListener('updatefound', () => {
                newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('[SYD] ¡Nueva versión de la app instalada en caché! Mostrando banner.');
                        document.getElementById('updateBanner').classList.add('show');
                    }
                });
            });
        }).catch(err => console.log('[SYD] Fallo SW:', err));

        let refreshing;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
        });
    });
}

function applyUpdate() {
    document.getElementById('updateBanner').classList.remove('show');
    document.getElementById('updateBanner').style.display = 'none';
    localStorage.setItem('syd_sw_version', APP_VERSION);
    if (newWorker) {
        newWorker.postMessage('SKIP_WAITING');
    }
}

// Comprobar actualizaciones de forma ultra-eficiente al regresar a la aplicación (foco)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && swRegistration) {
        console.log('[SYD] Regresando a la app. Verificando actualización...');
        swRegistration.update().catch(err => console.warn('[SYD] Fallo silencioso al verificar actualización:', err));
    }
});



// ══ NOTIFICACIONES PUSH ══

// Verificar estado de notificaciones al cargar la app
async function checkNotificationState() {
    const btn = document.getElementById('btnNotificaciones');
    if (!btn) return;
    btn.style.display = 'inline-flex';

    // Si el navegador ya tiene permiso concedido, renovar token silenciosamente
    if ('Notification' in window && Notification.permission === 'granted') {
        btn.innerHTML = '✅ Notificaciones Activas';
        btn.style.background = 'rgba(16,185,129,0.3)';
        btn.onclick = null;
        // Renovar token silenciosamente en segundo plano
        silentTokenRefresh();
    } else if ('Notification' in window && Notification.permission === 'denied') {
        btn.textContent = '🔕 Bloqueadas';
        btn.style.background = 'rgba(239,68,68,0.15)';
        btn.onclick = null;
    }
    // Si es 'default', el botón se queda como "Activar Notificaciones" con el onclick normal
}

// Renovar token FCM sin molestar al usuario
async function silentTokenRefresh() {
    try {
        const swReg = await navigator.serviceWorker.register('./firebase-messaging-sw.js');
        const messaging = firebase.messaging();
        const currentToken = await messaging.getToken({
            vapidKey: 'BP5uGPJZJZMo96OJrijWl6mik2e2gd7RmJnzD6VNqTbt6HEroOWDsVFjlrLsmYLGUGCmBKWPOeNMsr8zG1kWg_c',
            serviceWorkerRegistration: swReg
        });
        if (currentToken && session && session.email) {
            const obraId = (currentObra && currentObra.id) ? currentObra.id : 'sauces';
            await db.collection('obras').doc(obraId).collection('tokens').doc(session.email).set({
                token: currentToken,
                email: session.email,
                role: session.role,
                obra: obraId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('[SYD] Token renovado silenciosamente para', obraId);
        }
    } catch(e) {
        console.warn('[SYD] Token refresh silencioso falló (no crítico):', e.message);
    }
}

async function requestPushPermission() {
    try {
        const btn = document.getElementById('btnNotificaciones');
        btn.textContent = '⏳ Solicitando...';
        
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('[SYD] Permiso de notificación concedido.');
            
            const swReg = await navigator.serviceWorker.register('./firebase-messaging-sw.js');
            const messaging = firebase.messaging();
            const currentToken = await messaging.getToken({
                vapidKey: 'BP5uGPJZJZMo96OJrijWl6mik2e2gd7RmJnzD6VNqTbt6HEroOWDsVFjlrLsmYLGUGCmBKWPOeNMsr8zG1kWg_c',
                serviceWorkerRegistration: swReg
            });
            
            if (currentToken) {
                const obraId = (currentObra && currentObra.id) ? currentObra.id : 'sauces';
                await db.collection('obras').doc(obraId).collection('tokens').doc(session.email).set({
                    token: currentToken,
                    email: session.email,
                    role: session.role,
                    obra: obraId,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                btn.innerHTML = '✅ Notificaciones Activas';
                btn.style.background = 'rgba(16,185,129,0.3)';
                btn.onclick = null;
                console.log('[SYD] Token guardado en obras/' + obraId + '/tokens/' + session.email);
            } else {
                btn.textContent = '❌ Error de Token';
            }
        } else {
            btn.textContent = '🔕 Notificaciones Bloqueadas';
        }
    } catch (error) {
        console.error('[SYD] Error al solicitar permiso:', error);
        document.getElementById('btnNotificaciones').textContent = '❌ Error: ' + error.message;
    }
}

// Escuchar mensajes en primer plano (foreground)
if (typeof firebase !== 'undefined' && firebase.messaging) {
    try {
        const messaging = firebase.messaging();
        messaging.onMessage((payload) => {
            console.log('[SYD] Mensaje recibido en primer plano:', payload);
            // Mostrar alerta en pantalla
            alert('🔔 SYD: ' + (payload.notification?.title || 'Nueva Notificación') + '\n' + (payload.notification?.body || ''));
        });
    } catch(e) { console.warn('[SYD] Error iniciando messaging en primer plano:', e); }
}



// ══════════════════════════════════════
// BITACORA DE OBRA — Modulo Master
// ══════════════════════════════════════
let bitacoraSemana = 1;
let bitacoraRecognition = null;

function initBitacoraView() {
    bitacoraSemana = currentWeek;
    const obraLabel = document.getElementById('bitacoraObraName');
    if(obraLabel && currentObra) obraLabel.textContent = currentObra.name || currentObra.id;
    updateBitacoraSemanaUI();
    cargarNotasBitacora();
}

function changeBitacoraSemana(delta) {
    bitacoraSemana = Math.max(1, Math.min(TOTAL_WEEKS, bitacoraSemana + delta));
    updateBitacoraSemanaUI();
    cargarNotasBitacora();
}

function updateBitacoraSemanaUI() {
    const label = document.getElementById('bitacoraSemanaLabel');
    const display = document.getElementById('bitacoraWeekDisplay');
    if(label) label.textContent = 'Semana ' + bitacoraSemana;
    if(display) display.textContent = 'Semana ' + bitacoraSemana;
}

async function guardarNotaBitacora() {
    const input = document.getElementById('bitacoraInput');
    const texto = input.value.trim();
    if(!texto) { alert('Escribe algo antes de guardar.'); return; }
    if(!db || !session || !session.obra) { alert('No hay conexión.'); return; }
    
    try {
        const now = new Date();
        await db.collection('obras').doc(session.obra).collection('bitacora').add({
            semana: bitacoraSemana,
            texto: texto,
            fecha: now.toLocaleDateString('es-MX'),
            hora: now.toLocaleTimeString('es-MX', {hour:'2-digit', minute:'2-digit'}),
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            usuario: session.email || 'master'
        });
        input.value = '';
        cargarNotasBitacora();
    } catch(e) { alert('Error al guardar: ' + e.message); }
}

async function cargarNotasBitacora() {
    if(!db || !session || !session.obra) return;
    const container = document.getElementById('bitacoraTimeline');
    if(!container) return;
    
    try {
        const snap = await db.collection('obras').doc(session.obra).collection('bitacora')
            .where('semana', '==', bitacoraSemana)
            .orderBy('timestamp', 'desc')
            .get();
        
        if(snap.empty) {
            container.innerHTML = '<div style="text-align:center; padding:30px; color:var(--muted); font-size:0.8rem;">Sin notas para esta semana</div>';
            document.getElementById('bitacoraNotaCount').textContent = '0 notas';
            return;
        }
        
        let html = '';
        let count = 0;
        snap.forEach(doc => {
            const d = doc.data();
            count++;
            html += `
                <div style="background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:14px; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div style="flex:1;">
                            <div style="font-size:0.65rem; color:var(--muted); margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                                <span style="background:rgba(59,130,246,0.2); color:#93c5fd; padding:2px 8px; border-radius:10px; font-weight:700;">${d.fecha || ''}</span>
                                <span>${d.hora || ''}</span>
                            </div>
                            <div style="font-size:0.85rem; color:#e2e8f0; line-height:1.5;">${d.texto}</div>
                        </div>
                        <button onclick="borrarNotaBitacora('${doc.id}')" style="background:none; border:none; color:rgba(239,68,68,0.6); cursor:pointer; font-size:1rem; padding:4px 8px; flex-shrink:0;" title="Eliminar">✕</button>
                    </div>
                </div>`;
        });
        container.innerHTML = html;
        document.getElementById('bitacoraNotaCount').textContent = count + ' nota' + (count !== 1 ? 's' : '');
    } catch(e) {
        container.innerHTML = '<div style="color:#f87171; padding:16px; text-align:center;">Error: ' + e.message + '</div>';
    }
}

async function borrarNotaBitacora(id) {
    if(!confirm('¿Eliminar esta nota?')) return;
    try {
        await db.collection('obras').doc(session.obra).collection('bitacora').doc(id).delete();
        cargarNotasBitacora();
    } catch(e) { alert('Error: ' + e.message); }
}

function dictarNotaBitacora() {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!Speech) { alert('Tu navegador no soporta dictado por voz.'); return; }
    
    if(!bitacoraRecognition) {
        bitacoraRecognition = new Speech();
        bitacoraRecognition.lang = 'es-MX';
        bitacoraRecognition.onresult = (e) => {
            const text = e.results[0][0].transcript;
            document.getElementById('bitacoraInput').value += (document.getElementById('bitacoraInput').value ? '\n' : '') + text;
        };
        bitacoraRecognition.onstart = () => {
            document.getElementById('btnDictarBitacora').style.background = '#ef4444';
            document.getElementById('btnDictarBitacora').textContent = '🛑';
        };
        bitacoraRecognition.onend = () => {
            document.getElementById('btnDictarBitacora').style.background = 'rgba(255,255,255,0.08)';
            document.getElementById('btnDictarBitacora').textContent = '🎤';
        };
    }
    try { bitacoraRecognition.start(); } catch(e) { bitacoraRecognition.stop(); }
}

async function generarInformeBitacora() {
    if(!db || !session || !session.obra) return;
    const btn = document.getElementById('btnGenerarBitacora');
    const oldText = btn.innerHTML;
    btn.innerHTML = '⏳ Generando...';
    btn.disabled = true;
    
    try {
        const snap = await db.collection('obras').doc(session.obra).collection('bitacora')
            .where('semana', '==', bitacoraSemana)
            .orderBy('timestamp', 'asc')
            .get();
        
        if(snap.empty) { alert('No hay notas para generar el informe.'); return; }
        
        let notas = [];
        snap.forEach(doc => notas.push(doc.data()));
        
        const obraName = (currentObra && currentObra.name) ? currentObra.name : session.obra;
        const now = new Date();
        
        let notasHtml = notas.map(n => 
            `<tr><td style="padding:8px 12px; border-bottom:1px solid #eee; font-size:0.8rem; color:#64748b; white-space:nowrap;">${n.fecha || ''}<br>${n.hora || ''}</td><td style="padding:8px 12px; border-bottom:1px solid #eee; font-size:0.85rem; color:#1e293b;">${n.texto}</td></tr>`
        ).join('');
        
        const informeHtml = `
            <div style="font-family:'Inter',Arial,sans-serif; max-width:700px; margin:0 auto; padding:20px;">
                <div style="background:linear-gradient(135deg,#1e3a8a,#1e1b4b); color:#fff; padding:24px; border-radius:16px 16px 0 0;">
                    <div style="font-size:1.3rem; font-weight:800;">🏗️ ${obraName}</div>
                    <div style="font-size:0.85rem; opacity:0.8; margin-top:4px;">Bitácora de Obra — Semana ${bitacoraSemana}</div>
                    <div style="font-size:0.7rem; opacity:0.6; margin-top:8px;">Generado: ${now.toLocaleDateString('es-MX')} a las ${now.toLocaleTimeString('es-MX', {hour:'2-digit', minute:'2-digit'})}</div>
                </div>
                <div style="background:#fff; border:1px solid #e2e8f0; border-top:none; border-radius:0 0 16px 16px; padding:20px;">
                    <div style="font-size:0.9rem; font-weight:700; color:#1e293b; margin-bottom:12px;">📝 Registro de Actividades (${notas.length} notas)</div>
                    <table style="width:100%; border-collapse:collapse;">
                        <thead><tr style="background:#f8fafc;">
                            <th style="padding:10px 12px; text-align:left; font-size:0.7rem; color:#64748b; text-transform:uppercase; font-weight:700;">Fecha</th>
                            <th style="padding:10px 12px; text-align:left; font-size:0.7rem; color:#64748b; text-transform:uppercase; font-weight:700;">Nota</th>
                        </tr></thead>
                        <tbody>${notasHtml}</tbody>
                    </table>
                    <div style="margin-top:20px; padding-top:16px; border-top:1px solid #e2e8f0; font-size:0.7rem; color:#94a3b8; text-align:center;">
                        SYD Constructores · Informe generado automáticamente
                    </div>
                </div>
            </div>`;
        
        const docRef = await db.collection('obras').doc(session.obra).collection('informes_bitacora').add({
            semana: bitacoraSemana,
            obra: session.obra,
            obraName: obraName,
            titulo: 'Bitácora Semana ' + bitacoraSemana + ' - ' + obraName,
            totalNotas: notas.length,
            html: informeHtml,
            fechaGenerado: firebase.firestore.FieldValue.serverTimestamp(),
            fechaTexto: now.toLocaleDateString('es-MX'),
            enviado: false,
            emailMaster: session.email
        });
        
        mostrarInformeBitacora(informeHtml, docRef.id);
    } catch(e) {
        alert('Error: ' + e.message);
    } finally {
        btn.innerHTML = oldText;
        btn.disabled = false;
    }
}

function mostrarInformeBitacora(html, docId) {
    const old = document.getElementById('bitacoraModal');
    if(old) old.remove();
    
    const modal = document.createElement('div');
    modal.id = 'bitacoraModal';
    modal.style.cssText = 'position:fixed; inset:0; z-index:99999; background:#f1f5f9; overflow-y:auto;';
    
    const toolbar = document.createElement('div');
    toolbar.style.cssText = 'position:sticky; top:0; z-index:10; background:#1e293b; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 2px 10px rgba(0,0,0,0.3);';
    toolbar.innerHTML = `
        <button onclick="document.getElementById('bitacoraModal').remove()" style="background:rgba(255,255,255,0.1); color:#fff; border:none; padding:8px 16px; border-radius:10px; font-weight:700; cursor:pointer;">← Volver</button>
        <div style="font-size:0.75rem; color:#10b981; font-weight:700;">✅ Guardado en Base de Datos</div>`;
    
    const content = document.createElement('div');
    content.style.cssText = 'padding:20px;';
    content.innerHTML = html;
    
    modal.appendChild(toolbar);
    modal.appendChild(content);
    document.body.appendChild(modal);
}

async function verHistorialBitacora() {
    if(!db || !session || !session.obra) return;
    
    const old = document.getElementById('bitacoraHistModal');
    if(old) old.remove();
    
    const modal = document.createElement('div');
    modal.id = 'bitacoraHistModal';
    modal.style.cssText = 'position:fixed; inset:0; z-index:100000; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; padding:20px;';
    
    const container = document.createElement('div');
    container.style.cssText = 'background:#1f2937; width:100%; max-width:500px; max-height:80vh; border-radius:24px; padding:24px; overflow-y:auto; border:1px solid rgba(255,255,255,0.1);';
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h3 style="margin:0; font-size:1rem; color:#fff;">📅 Historial de Informes</h3>
            <button onclick="document.getElementById('bitacoraHistModal').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:#94a3b8;">&times;</button>
        </div>
        <div id="bitacoraHistList"><div style="text-align:center; padding:20px; color:#64748b;">Cargando...</div></div>`;
    
    modal.appendChild(container);
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if(e.target === modal) modal.remove(); });
    
    try {
        const snap = await db.collection('obras').doc(session.obra).collection('informes_bitacora')
            .orderBy('fechaGenerado', 'desc').limit(20).get();
        
        const list = document.getElementById('bitacoraHistList');
        if(snap.empty) { list.innerHTML = '<div style="text-align:center; padding:20px; color:#64748b;">No hay informes generados aún.</div>'; return; }
        
        let h = '';
        snap.forEach(doc => {
            const d = doc.data();
            h += `<div onclick="abrirInformeBitacora('${doc.id}')" style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:14px; padding:14px; cursor:pointer; margin-bottom:8px;">
                <div style="font-size:0.85rem; font-weight:700; color:#fff;">${d.titulo || ''}</div>
                <div style="font-size:0.7rem; color:#64748b; margin-top:4px;">${d.fechaTexto || ''} · ${d.totalNotas || 0} notas</div>
            </div>`;
        });
        list.innerHTML = h;
    } catch(e) { document.getElementById('bitacoraHistList').innerHTML = '<div style="color:#f87171;">Error: ' + e.message + '</div>'; }
}

async function abrirInformeBitacora(docId) {
    try {
        const doc = await db.collection('obras').doc(session.obra).collection('informes_bitacora').doc(docId).get();
        if(doc.exists && doc.data().html) {
            document.getElementById('bitacoraHistModal').remove();
            mostrarInformeBitacora(doc.data().html, docId);
        }
    } catch(e) { alert('Error: ' + e.message); }
}


// ══════════════════════════════════════
// ══ FIREBASE CONFIG — PEGA TUS VALORES AQUÍ ══
// ══════════════════════════════════════
// 1. Ve a: https://console.firebase.google.com
// 2. Crea un proyecto llamado "syd-constructores"
// 3. Crea una app Web (</>)
// 4. Crea Firestore Database (modo de prueba)
// 5. Copia la config y pega los valores aquí:


// ══ Firebase init (graceful — la app funciona sin Firebase) ══
let db = null;
try {
    if (!FIREBASE_CONFIG.apiKey.includes('PEGA_AQUI')) {
        firebase.initializeApp(FIREBASE_CONFIG);
        db = firebase.firestore();
        console.log('[SYD] Firebase conectado');
    } else {
        console.log('[SYD] Firebase no configurado — modo local');
    }
} catch(e) { console.warn('[SYD] Firebase error:', e.message); }

// ══ Log de acceso a Firestore ══
async function logAccess(email, role, action='login', extra={}) {
    if (!db) return;
    try {
        await db.collection('access_logs').add({
            email, role, action,
            ...extra,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            fecha: new Date().toLocaleDateString('es-MX'),
            hora:  new Date().toLocaleTimeString('es-MX'),
            ua:    navigator.userAgent.substring(0,80)
        });
    } catch(e) { console.warn('Log error:', e.message); }
}

// ══ Render panel REGISTROS FULL (NUEVO) ══
async function renderRegistrosCompletos(el) {
    if (!el) el = document.getElementById('accesosContent');
    if (!el) return;
    if (!db) { el.innerHTML = '<div style="color:#fbbf24;padding:20px;text-align:center">Firebase no configurado</div>'; return; }
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted)">Cargando...</div>';
    try {
        const snap = await db.collection('access_logs').orderBy('timestamp','desc').limit(50).get();
        if (snap.empty) { el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted)">Sin registros aún</div>'; return; }
        const roleIcon = {master:'⚡',observer:'👁',client:'🏠'};
        const actionColor = {login:'#10b981', logout:'#64748b', registro:'#8b5cf6', registro_y_login:'#8b5cf6'};
        const actionLabel = {login:'Entró', logout:'Salió', registro:'Nuevo Registro', registro_y_login:'Nuevo Registro'};
        
        let html = `
            <div style="margin-bottom:12px; display:flex; flex-wrap:wrap; gap:10px; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="font-size:0.7rem;color:var(--muted);">${snap.size} registro(s) · últimos 50</div>
                    <button id="btnDeleteLogs" onclick="deleteSelectedLogs()" style="display:none; padding:5px 12px; background:#ef4444; color:#fff; border:none; border-radius:6px; font-size:0.7rem; font-weight:700; cursor:pointer;">
                        🗑️ Eliminar seleccionados
                    </button>
                </div>
                <input type="text" id="filterRegistros" placeholder="Búsqueda global..." 
                       style="padding:6px 12px; border-radius:6px; border:1px solid var(--border); background:rgba(0,0,0,0.2); color:#fff; width: 220px; font-size:0.8rem; font-family:Inter,sans-serif;" 
                       onkeyup="filterRegistrosTable()">
            </div>
            <div style="overflow-x:auto; border-radius:8px; border:1px solid var(--border); background:var(--surface);">
                <table id="registrosTable" style="width:100%; border-collapse:collapse; text-align:left; font-size:0.75rem; white-space:nowrap;">
                    <thead style="background:rgba(255,255,255,0.03); border-bottom:1px solid var(--border);">
                        <tr>
                            <th style="padding:10px 12px; width:30px;"><input type="checkbox" id="selectAllLogs" onclick="toggleSelectAllLogs(this)"></th>
                            <th style="padding:10px 12px; color:var(--muted); font-weight:600; vertical-align:top;">Fecha</th>
                            <th style="padding:10px 12px; color:var(--muted); font-weight:600; vertical-align:top;">
                                Acción<br>
                                <select id="filterAccion" onchange="filterRegistrosTable()" style="background:var(--surface); color:#cbd5e1; border:1px solid var(--border); border-radius:4px; font-size:0.65rem; margin-top:6px; padding:3px; outline:none;">
                                    <option value="">Todas</option>
                                    <option value="entró">Entró</option>
                                    <option value="salió">Salió</option>
                                    <option value="nuevo registro">Nuevo Registro</option>
                                </select>
                            </th>
                            <th style="padding:10px 12px; color:var(--muted); font-weight:600; vertical-align:top;">Usuario</th>
                            <th style="padding:10px 12px; color:var(--muted); font-weight:600; vertical-align:top;">
                                Rol<br>
                                <select id="filterRol" onchange="filterRegistrosTable()" style="background:var(--surface); color:#cbd5e1; border:1px solid var(--border); border-radius:4px; font-size:0.65rem; margin-top:6px; padding:3px; outline:none;">
                                    <option value="">Todos</option>
                                    <option value="master">Master</option>
                                    <option value="supervisor">Supervisor</option>
                                    <option value="client">Cliente</option>
                                </select>
                            </th>
                            <th style="padding:10px 12px; color:var(--muted); font-weight:600; vertical-align:top;">
                                Obra<br>
                                <input type="text" id="filterObra" onkeyup="filterRegistrosTable()" placeholder="Buscar obra..." style="width:70px; background:var(--surface); color:#cbd5e1; border:1px solid var(--border); border-radius:4px; font-size:0.65rem; margin-top:6px; padding:3px; outline:none;">
                            </th>
                            <th style="padding:10px 12px; color:var(--muted); font-weight:600; vertical-align:top;">Detalles</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        snap.forEach(doc => {
            const d = doc.data();
            const color = actionColor[d.action] || '#64748b';
            const label = actionLabel[d.action] || d.action;
            const hasDetails = (d.action === 'registro' || d.action === 'registro_y_login') && d.nombre;
            html += `
                        <tr class="registro-row" style="border-bottom:1px solid rgba(255,255,255,0.05);">
                            <td style="padding:10px 12px;"><input type="checkbox" class="log-check" value="${doc.id}" onclick="updateLogDeleteButton()"></td>
                            <td class="col-fecha" style="padding:10px 12px;">${d.fecha||''} ${d.hora||''}</td>
                            <td class="col-accion" style="padding:10px 12px;">
                                <span style="font-size:0.65rem;background:${color}22;color:${color};padding:2px 8px;border-radius:20px">${label}</span>
                            </td>
                            <td class="col-usuario" style="padding:10px 12px; font-weight:600;">${d.email||'—'}</td>
                            <td class="col-rol" style="padding:10px 12px;">${roleIcon[d.role]||''} ${d.role||'—'}</td>
                            <td class="col-obra" style="padding:10px 12px; color:#a78bfa;">${d.obra || '—'}</td>
                            <td class="col-detalles" style="padding:10px 12px; color:#a78bfa;">
                                ${hasDetails ? `Nombre: ${d.nombre} | Clave: ${d.password} | WhatsApp: ${d.telefono||'—'}` : '—'}
                            </td>
                        </tr>
            `;
        });
        html += `</tbody></table></div>`;
        el.innerHTML = html;
    } catch(e) { el.innerHTML = `<div style="color:#f87171;padding:16px">Error: ${e.message}</div>`; }
}

function filterRegistrosTable() {
    const globalInput = document.getElementById('filterRegistros');
    const globalFilter = globalInput ? globalInput.value.toLowerCase() : '';
    
    const accionFilter = document.getElementById('filterAccion').value.toLowerCase();
    const rolFilter = document.getElementById('filterRol').value.toLowerCase();
    const obraFilter = document.getElementById('filterObra').value.toLowerCase();

    const rows = document.querySelectorAll('.registro-row');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const colAccion = row.querySelector('.col-accion').textContent.toLowerCase();
        const colRol = row.querySelector('.col-rol').textContent.toLowerCase();
        const colObra = row.querySelector('.col-obra').textContent.toLowerCase();

        let show = true;
        if (globalFilter && !text.includes(globalFilter)) show = false;
        if (accionFilter && !colAccion.includes(accionFilter)) show = false;
        if (rolFilter && !colRol.includes(rolFilter)) show = false;
        if (obraFilter && !colObra.includes(obraFilter)) show = false;

        row.style.display = show ? '' : 'none';
    });
}

function toggleSelectAllLogs(main) {
    document.querySelectorAll('.log-check').forEach(c => c.checked = main.checked);
    updateLogDeleteButton();
}

function updateLogDeleteButton() {
    const anyChecked = document.querySelectorAll('.log-check:checked').length > 0;
    const btn = document.getElementById('btnDeleteLogs');
    if (btn) btn.style.display = anyChecked ? 'block' : 'none';
}

async function deleteSelectedLogs() {
    if (!confirm('¿Seguro que deseas eliminar los registros seleccionados?\nEsto también eliminará su acceso al sistema.')) return;
    const ids = Array.from(document.querySelectorAll('.log-check:checked')).map(c => c.value);
    const btn = document.getElementById('btnDeleteLogs');
    btn.disabled = true;
    btn.textContent = '⏳ Eliminando...';

    try {
        const batch = db.batch();

        for (const id of ids) {
            // 1. Borrar de access_logs
            batch.delete(db.collection('access_logs').doc(id));

            // 2. Buscar y borrar también de 'clientes' (por el email del log)
            try {
                const logDoc = await db.collection('access_logs').doc(id).get();
                if (logDoc.exists && logDoc.data().email) {
                    const email = logDoc.data().email;
                    const clienteSnap = await db.collection('clientes').where('email', '==', email).get();
                    clienteSnap.forEach(cdoc => batch.delete(cdoc.ref));
                }
            } catch(inner) {
                console.warn('[SYD] No se pudo borrar cliente:', inner);
            }
        }

        await batch.commit();
        await renderRegistrosCompletos();
        alert(`✅ ${ids.length} registro(s) eliminado(s) correctamente.`);
    } catch(e) {
        alert('Error al eliminar: ' + e.message);
        btn.disabled = false;
        btn.textContent = '🗑️ Eliminar seleccionados';
    }
}


// ══ Log de cambios en avance (Punto 3) ══
let _cambioTimer = null;
let _originalValorAnterior = {};

function updateProgress(zIdx, val) {
    if(session.role!=='master') return;
    val = parseFloat(val);
    
    if (_originalValorAnterior[zIdx] === undefined) {
        _originalValorAnterior[zIdx] = projectData[zIdx].progress[currentWeek-1];
    }
    
    projectData[zIdx].progress[currentWeek-1] = val;
    // Debounce: guardar en Firebase 1.5s después de soltar el slider o dejar de pulsar botones
    clearTimeout(_cambioTimer);
    _cambioTimer = setTimeout(() => {
        const initialVal = _originalValorAnterior[zIdx];
        delete _originalValorAnterior[zIdx];
        logCambio(zIdx, initialVal, val);
    }, 1500);
    // Update UI
    const cell = document.getElementById(`gc-${zIdx}-${currentWeek}`);
    if(cell) cell.style.background = `linear-gradient(90deg,rgba(245,158,11,0.5) ${val}%,rgba(245,158,11,0.08) ${val}%)`;
    ['pf-','dpf-'].forEach(pre => { const el=document.getElementById(pre+zIdx); if(el) el.style.width=val+'%'; });
    ['pv-','dpv-','pct-'].forEach(pre => { const el=document.getElementById(pre+zIdx); if(el) el.textContent=val+'%'; });
    const zones = getVisibleZones();
    const avgP = Math.round(zones.reduce((s,z)=>s+z.data.progress[currentWeek-1],0)/zones.length);
    const avgEl = document.querySelector('#statsGrid .stat-card:nth-child(2) .stat-value');
    if(avgEl) avgEl.textContent = avgP+'%';
}

function stepProgress(zIdx, delta) {
    const currentProg = parseFloat(projectData[zIdx].progress[currentWeek-1]) || 0;
    let newProg = currentProg + delta;
    if (newProg < 0) newProg = 0;
    if (newProg > 100) newProg = 100;
    updateProgress(zIdx, newProg);
}

async function logCambio(zIdx, valorAnterior, valorNuevo) {
    if(!db || valorAnterior === valorNuevo) return;
    const zona = projectData[zIdx];
    try {
        await db.collection('obras').doc('SAUCES')
            .collection('cambios_avance').add({
                obra:          'SAUCES',
                zona:          zona.zone,
                zona_idx:      zIdx,
                semana:        currentWeek,
                tarea:         zona.tasks[currentWeek-1] || '',
                valor_anterior: valorAnterior,
                valor_nuevo:   valorNuevo,
                usuario:       session.email,
                timestamp:     firebase.firestore.FieldValue.serverTimestamp(),
                fecha:         new Date().toLocaleDateString('es-MX'),
                hora:          new Date().toLocaleTimeString('es-MX')
            });
        console.log('[SYD] Cambio guardado:', zona.zone, 'Sem', currentWeek, valorAnterior, '->', valorNuevo);
    } catch(e) { console.warn('logCambio error:', e.message); }
}

// ══ Render historial de cambios ══
async function renderHistorial(el) {
    if(!db) { el.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px">Firebase no conectado</div>'; return; }
    el.innerHTML = '<div style="text-align:center;padding:16px;color:var(--muted)">Cargando historial...</div>';
    try {
        const snap = await db.collection('obras').doc('SAUCES')
            .collection('cambios_avance')
            .orderBy('timestamp','desc').limit(60).get();
        if(snap.empty) { el.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted)">Sin cambios registrados aún</div>'; return; }
        const ZONE_C = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444'];
        let html = `<div style="font-size:0.7rem;color:var(--muted);margin-bottom:10px">${snap.size} cambio(s) · últimos 60</div>`;
        snap.forEach(doc => {
            const d = doc.data();
            const zc = ZONE_C[d.zona_idx] || '#64748b';
            const diff = d.valor_nuevo - d.valor_anterior;
            const arrow = diff >= 0 ? '↑' : '↓';
            const dc = diff >= 0 ? '#10b981' : '#ef4444';
            html += `
            <div style="background:var(--surface);border:1px solid var(--border);
                        border-radius:12px;padding:12px 14px;margin-bottom:8px;
                        border-left:3px solid ${zc}">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                    <span style="font-weight:700;font-size:0.8rem;color:${zc}">${d.zona||''}</span>
                    <span style="font-size:0.75rem;font-weight:800;color:${dc}">
                        ${arrow} ${d.valor_anterior}% → ${d.valor_nuevo}%
                    </span>
                </div>
                <div style="font-size:0.72rem;color:var(--soft);margin-bottom:3px">
                    Sem ${d.semana} · ${d.tarea||''}
                </div>
                <div style="font-size:0.68rem;color:var(--muted)">
                    ${d.fecha||''} · ${d.hora||''} · ${d.usuario||''}
                </div>
            </div>`;
        });
        el.innerHTML = html;
    } catch(e) { el.innerHTML = `<div style="color:#f87171;padding:16px">Error: ${e.message}</div>`; }
}

// ══ Panel de accesos MEJORADO (con tabs Accesos / Historial) ══
async function renderAccesos() {
    const container = document.getElementById('accesosContent');
    container.innerHTML = `
        <div style="display:flex;gap:8px;margin-bottom:14px">
            <button onclick="showAccesosTab('log')" id="btnTabLog"
                style="flex:1;padding:9px;border:1px solid rgba(59,130,246,0.5);
                       border-radius:10px;background:rgba(59,130,246,0.15);
                       color:#93c5fd;font-size:0.75rem;font-weight:700;
                       font-family:Inter,sans-serif;cursor:pointer">
                📲 Accesos (${db?'activo':'sin conex.'})
            </button>
            <button onclick="showAccesosTab('historial')" id="btnTabHistorial"
                style="flex:1;padding:9px;border:1px solid rgba(255,255,255,0.08);
                       border-radius:10px;background:transparent;
                       color:var(--muted);font-size:0.75rem;font-weight:700;
                       font-family:Inter,sans-serif;cursor:pointer">
                📄 Historial cambios
            </button>
        </div>
        <div id="accesosSubLog"></div>
        <div id="accesosSubHistorial" style="display:none"></div>`;
    showAccesosTab('log');
}

async function showAccesosTab(tab) {
    const btnLog = document.getElementById('btnTabLog');
    const btnHist = document.getElementById('btnTabHistorial');
    const divLog = document.getElementById('accesosSubLog');
    const divHist = document.getElementById('accesosSubHistorial');
    if(!btnLog) return;
    if(tab === 'log') {
        btnLog.style.background = 'rgba(59,130,246,0.15)'; btnLog.style.color='#93c5fd'; btnLog.style.borderColor='rgba(59,130,246,0.5)';
        btnHist.style.background = 'transparent'; btnHist.style.color='var(--muted)'; btnHist.style.borderColor='rgba(255,255,255,0.08)';
        divLog.style.display=''; divHist.style.display='none';
        await renderRegistrosCompletos(divLog);
    } else {
        btnHist.style.background = 'rgba(245,158,11,0.15)'; btnHist.style.color='#fbbf24'; btnHist.style.borderColor='rgba(245,158,11,0.5)';
        btnLog.style.background = 'transparent'; btnLog.style.color='var(--muted)'; btnLog.style.borderColor='rgba(255,255,255,0.08)';
        divHist.style.display=''; divLog.style.display='none';
        await renderHistorial(divHist);
    }
}


// ══════════════════════════════════════
let projectData = [];
let OBRAS_CATALOG = [];
let currentObra = null;

async function loadGlobalData() {
    try {
        const resp = await fetch('database/projects.json?v=' + Date.now());
        OBRAS_CATALOG = await resp.json();
        console.log('[SYD] Proyectos cargados:', OBRAS_CATALOG.length);
    } catch(e) {
        console.error('[SYD] Error cargando proyectos:', e);
        // Fallback minimo
        OBRAS_CATALOG = [{id:'sauces', nombre:'Sauces', status:'activa'}];
    }
}

async function loadProjectData(obraId) {
    const obra = OBRAS_CATALOG.find(o => o.id.toLowerCase() === obraId.toLowerCase());
    if(!obra) return false;
    try {
        const resp = await fetch((obra.dataFile || `database/${obraId.toLowerCase()}.json`) + '?v=' + Date.now());
        const data = await resp.json();
        projectData = data.zones;
        currentObra = obra;
        currentObra.documentos = data.documentos || [];
        TOTAL_WEEKS = currentObra.totalSemanas || 32;
        return true;
    } catch(e) {
        console.error('[SYD] Error cargando datos de obra:', e);
        return false;
    }
}

// ══════════════════════════════════════
// OBRA SELECTOR
// ══════════════════════════════════════

function showObraSelector() {
    document.getElementById('loginScreen').style.display    = 'none';
    document.getElementById('obraSelector').style.display  = 'flex';
    document.getElementById('appShell').style.display      = 'none';
    // Role badge
    const rb = document.getElementById('selectorRoleBadge');
    const labels = { master:'⚡ Master', observer:'👁 Supervisor' };
    rb.textContent = labels[session.role] || session.role;
    rb.className = 'selector-role-badge ' + session.role;
    // Build grid
    buildObrasGrid();
}

function buildObrasGrid() {
    const grid = document.getElementById('obrasGrid');
    grid.innerHTML = OBRAS_CATALOG.map(obra => `
        <div class="obra-card" onclick="selectObra('${obra.id}')">
            <img class="obra-card-img" src="${obra.img || ''}" alt="${obra.name}"
                 onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
            <div class="obra-card-img-fallback" style="display:none">${obra.emoji || '🏗️'}</div>
            <span class="obra-card-status ${obra.status}">${obra.status}</span>
            <div class="obra-card-body">
                <div class="obra-card-name">${obra.name}</div>
                <div class="obra-card-meta">${obra.location || ''}</div>
            </div>
        </div>
    `).join('');
}

async function selectObra(obraId) {
    if(await loadProjectData(obraId)) {
        session.obra = obraId;
        localStorage.setItem('sauces_session', JSON.stringify(session));
        launchApp();
    } else {
        alert('No se pudieron cargar los datos de esta obra.');
    }
}

// ══════════════════════════════════════
// STATE
// ══════════════════════════════════════
let session = null;   // { role, email }
let TOTAL_WEEKS = 32;
let currentWeek = 1;
let currentTab = 'tareas';
let selectedRole = 'client';

const ZONE_COLORS = ['#3b82f6','#f59e0b','#10b981','#8b5cf6','#ef4444','#ec4899','#06b6d4','#84cc16'];

const AUTH = {
    master:   { code: 'MASTER2025' },
    observer: { code: 'SAUCES2025' },
    client:   { code: 'SAUCES' }
};

// ══════════════════════════════════════
// LOGIN UI
// ══════════════════════════════════════
const HINTS = {
    client:   '<strong>Cliente:</strong> Ingresa tu correo y la clave de acceso que te proporcionó SYD Constructores. Acceso en modo lectura a tu obra.',
    observer: '<strong>Supervisor:</strong> Usa el código especial que te proporcionó el responsable de obra. Acceso de lectura a todas las obras.',
    master:   '<strong>Master:</strong> Acceso total con código de administrador. Puedes actualizar el avance de todas las zonas.'
};
const DYN_LABEL = {client:'Código de Obra', observer:'Código de acceso', master:'Código maestro'};
const DYN_PLACEHOLDER = {client:'Proporcionado por constructor', observer:'Código supervisor', master:'Código master'};
let authMode = 'login'; // 'login' | 'register'

function setAuthMode(mode, btn) {
    authMode = mode;
    document.querySelectorAll('.auth-toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Mostrar generador de reportes solo a Master (si ya hay sesión)
    const repCard = document.getElementById('reportGeneratorCard');
    if (repCard) {
        repCard.style.display = (session && session.role === 'master') ? 'block' : 'none';
        if (session && session.role === 'master') loadWeeklyNotes();
    }
    document.getElementById('fieldNombre').style.display = mode === 'register' ? 'block' : 'none';
    document.getElementById('fieldTelefono').style.display = mode === 'register' ? 'block' : 'none';
    document.getElementById('dynamicField').style.display = mode === 'register' ? 'block' : 'none'; // Only ask project code on register for client
    document.getElementById('btnLoginAction').textContent = mode === 'register' ? 'Crear mi cuenta →' : 'Acceder al sistema →';
    document.getElementById('loginError').classList.remove('show');
}

function selectRole(role, btn) {
    selectedRole = role;
    document.querySelectorAll('.role-tab').forEach(t=>t.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('dynLabel').textContent = DYN_LABEL[role];
    document.getElementById('loginCode').placeholder = DYN_PLACEHOLDER[role];
    document.getElementById('loginHint').innerHTML = HINTS[role];
    document.getElementById('loginError').classList.remove('show');
    
    if(role === 'client') {
        document.getElementById('clientAuthToggle').style.display = 'flex';
        document.getElementById('fieldPassword').style.display = 'block';
        // Apply current authMode visibility rules
        document.getElementById('fieldNombre').style.display = authMode === 'register' ? 'block' : 'none';
        document.getElementById('fieldTelefono').style.display = authMode === 'register' ? 'block' : 'none';
        document.getElementById('dynamicField').style.display = authMode === 'register' ? 'block' : 'none';
    } else {
        // Reset to login mode for Master/Supervisor
        if(authMode === 'register') {
            const loginBtn = document.querySelector('.auth-toggle-btn');
            if(loginBtn) setAuthMode('login', loginBtn);
        }
        document.getElementById('clientAuthToggle').style.display = 'none';
        document.getElementById('fieldPassword').style.display = 'none';
        document.getElementById('fieldNombre').style.display = 'none';
        document.getElementById('fieldTelefono').style.display = 'none';
        document.getElementById('dynamicField').style.display = 'block';
        document.getElementById('btnLoginAction').textContent = 'Acceder al sistema →';
    }
}

async function doAuthAction() {
    if(selectedRole === 'client' && authMode === 'register') {
        await doRegister();
    } else {
        await doLogin();
    }
}

async function doRegister() {
    const name  = document.getElementById('loginName').value.trim();
    const phone = document.getElementById('loginPhone').value.trim();
    const email = document.getElementById('loginEmail').value.trim();
    const pass  = document.getElementById('loginPassword').value;
    const code  = document.getElementById('loginCode').value.trim();
    const err   = document.getElementById('loginError');
    err.classList.remove('show');

    if(!name) { err.textContent='Ingresa tu nombre completo.'; err.classList.add('show'); return; }
    if(!phone) { err.textContent='Ingresa tu número de WhatsApp.'; err.classList.add('show'); return; }
    if(!email || !email.includes('@')) { err.textContent='Ingresa un correo válido.'; err.classList.add('show'); return; }
    if(pass.length < 5) { err.textContent='La contraseña debe tener al menos 5 caracteres.'; err.classList.add('show'); return; }
    if(!code) { err.textContent='Ingresa la clave de proyecto que te proporcionaron.'; err.classList.add('show'); return; }

    // Validate project code exists
    const foundObra = OBRAS_CATALOG.find(o => o.clientCode === code.toUpperCase()) || OBRAS_CATALOG[0];
    if(code.toUpperCase() !== AUTH.client.code && code.toUpperCase() !== foundObra.clientCode) {
        err.textContent='Clave de proyecto no válida.'; err.classList.add('show'); return;
    }

    try {
        const btn = document.getElementById('btnLoginAction');
        const oldText = btn.textContent;
        btn.textContent = 'Registrando...';
        btn.disabled = true;

        // Check if email already exists
        const snap = await db.collection('clientes').where('email', '==', email.toLowerCase()).get();
        if(!snap.empty) {
            err.textContent = 'Este correo ya está registrado. Inicia sesión.';
            err.classList.add('show');
            btn.textContent = oldText;
            btn.disabled = false;
            return;
        }

        // Create user in Firestore
        await db.collection('clientes').add({
            nombre: name,
            telefono: phone,
            email: email.toLowerCase(),
            password: pass, // In a production app, use Firebase Auth. For this MVP, storing plain.
            obra: foundObra.id,
            creado_en: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Automatically log in
        session = { role: 'client', email: email.toLowerCase(), nombre: name, telefono: phone, obra: foundObra.id };
        localStorage.setItem('sauces_session', JSON.stringify(session));
        logAccess(email.toLowerCase(), 'client', 'registro', {
            nombre: name,
            telefono: phone,
            password: pass,
            obra: foundObra.id
        });
        
        btn.textContent = oldText;
        btn.disabled = false;
        
        if(await loadProjectData(foundObra.id)) {
            launchApp();
        } else {
            err.textContent='Error cargando datos de la obra.'; err.classList.add('show');
        }
    } catch(e) {
        console.error("Error registering:", e);
        err.textContent = 'Error al conectar con la base de datos.';
        err.classList.add('show');
        document.getElementById('btnLoginAction').disabled = false;
        document.getElementById('btnLoginAction').textContent = 'Crear mi cuenta →';
    }
}

async function doLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass  = document.getElementById('loginPassword').value;
    const code  = document.getElementById('loginCode').value.trim();
    const err   = document.getElementById('loginError');
    err.classList.remove('show');

    if(!email || !email.includes('@')) { err.textContent='Ingresa un correo válido.'; err.classList.add('show'); return; }

    if(selectedRole === 'master') {
        if(!code) { err.textContent='Ingresa el código master.'; err.classList.add('show'); return; }
        if(code !== AUTH.master.code) { err.textContent='Código master incorrecto.'; err.classList.add('show'); return; }
        session = { role:'master', email };
    } else if(selectedRole === 'observer') {
        if(!code) { err.textContent='Ingresa el código supervisor.'; err.classList.add('show'); return; }
        if(code !== AUTH.observer.code) { err.textContent='Código de supervisor incorrecto.'; err.classList.add('show'); return; }
        session = { role:'observer', email };
    } else {
        if(!pass) { err.textContent='Ingresa tu contraseña.'; err.classList.add('show'); return; }
        
        try {
            const btn = document.getElementById('btnLoginAction');
            const oldText = btn.textContent;
            btn.textContent = 'Verificando...';
            btn.disabled = true;

            const snap = await db.collection('clientes')
                                .where('email', '==', email.toLowerCase())
                                .where('password', '==', pass)
                                .get();
            
            btn.textContent = oldText;
            btn.disabled = false;

            if(snap.empty) {
                err.textContent = 'Correo o contraseña incorrectos.';
                err.classList.add('show');
                return;
            }

            const clientData = snap.docs[0].data();
            session = { role: 'client', email: clientData.email, nombre: clientData.nombre, telefono: clientData.telefono || '', obra: clientData.obra };
        } catch(e) {
            console.error("Login error:", e);
            err.textContent = 'Error conectando con la base de datos.';
            err.classList.add('show');
            return;
        }
    }

    localStorage.setItem('sauces_session', JSON.stringify(session));
    logAccess(email, session.role, 'login');
    
    // Routing: master/observer → obra selector; client → direct to app
    if(session.role === 'client') {
        if(await loadProjectData(session.obra)) {
            launchApp();
        } else {
            err.textContent='Error cargando datos de la obra.'; err.classList.add('show');
        }
    } else {
        showObraSelector();
    }
}

function doLogout() {
    if(session) logAccess(session.email, session.role, 'logout');
    localStorage.removeItem('sauces_session');
    session = null; currentObra = null;
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('obraSelector').style.display = 'none';
    document.getElementById('appShell').style.display = 'none';
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginCode').value = '';
}

// ══════════════════════════════════════
// APP LAUNCH
// ══════════════════════════════════════
function launchApp() {
    // master/observer without currentObra → go to selector
    if((session.role==='master' || session.role==='observer') && !currentObra) {
        if(session.obra) {
            currentObra = OBRAS_CATALOG.find(o => o.id===session.obra) || OBRAS_CATALOG[0];
        } else {
            showObraSelector(); return;
        }
    }
    if(!currentObra) currentObra = OBRAS_CATALOG[0];

    document.getElementById('loginScreen').style.display    = 'none';
    document.getElementById('obraSelector').style.display  = 'none';
    document.getElementById('appShell').style.display      = 'block';

    // Role badge
    const rb = document.getElementById('roleBadge');
    const roleLabels = { master:'\u26a1 Master', observer:'\ud83d\udc41 Supervisor', client:'\ud83c\udfe0 Cliente' };
    rb.textContent = roleLabels[session.role];
    rb.className = 'role-badge ' + session.role;

    if(session.email) {
        document.getElementById('clientEmailBadge').textContent = session.email;
        document.getElementById('clientEmailBadge').style.display = 'inline-block';

    // Mostrar botón de notificaciones y verificar estado
    checkNotificationState();

    } else {
        document.getElementById('clientEmailBadge').style.display = 'none';

    // Mostrar botón de notificaciones y verificar estado
    checkNotificationState();

    }

    // Accesos tab: only Master
    const tabAcc = document.getElementById('tabAccesos');
    if(tabAcc) tabAcc.style.display = session.role==='master' ? '' : 'none';

    // Bitacora tab: only Master
    const tabBit = document.getElementById('tabBitacora');
    if(tabBit) tabBit.style.display = session.role==='master' ? '' : 'none';

    
    // Back to obras button visibility
    const btnBack = document.getElementById('btnBackToObras');
    if(btnBack) btnBack.style.display = session.role==='client' ? 'none' : 'block';

    // Subtitle with real obra name + Version
    const version = APP_VERSION;
    document.getElementById('appSubtitle').textContent = (currentObra.name || 'Proyecto') + (currentObra.location ? ' · ' + currentObra.location : '') + ' (' + version + ')';

    // Generador de reporte visibility
    const repCard = document.getElementById('reportGeneratorCard');
    if(repCard) {
        repCard.style.display = session.role==='master' ? 'block' : 'none';
        if(session.role==='master') loadWeeklyNotes();
    }

    // Hero image (foto de la obra en la cabecera del tab Tareas)
    const heroWrap  = document.getElementById('obraHeroWrap');
    const heroImg   = document.getElementById('obraHeroImg');
    const heroTitle = document.getElementById('obraHeroTitle');
    const heroSub   = document.getElementById('obraHeroSub');
    if(currentObra.img) {
        heroImg.src = currentObra.img;
        heroImg.onerror = () => { heroWrap.style.display='none'; };
        heroTitle.textContent = currentObra.name || '';
        heroSub.textContent   = currentObra.location || '';
        heroWrap.style.display = '';
    } else {
        heroWrap.style.display = 'none';
    }

    buildWeekDots();
    buildGanttTable();
    updateDashboard();
    const firstTab = document.querySelector('.tab-btn');
    if(firstTab) { firstTab.classList.add('active'); }
    // Restaurar cola de WhatsApp si quedó a medias por recarga/suspensión del PWA
    if (typeof checkAndRestoreWhatsAppQueue === 'function') {
        checkAndRestoreWhatsAppQueue();
    }
}

// ══════════════════════════════════════
// BUILD
// ══════════════════════════════════════
function buildWeekDots() {
    const c = document.getElementById('weekDots');
    c.innerHTML = '';
    for(let i=1;i<=TOTAL_WEEKS;i++){
        const d=document.createElement('div');
        d.className='week-dot';d.id=`dot-${i}`;c.appendChild(d);
    }
}

function buildGanttTable() {
    const t = document.getElementById('ganttTable');
    let html = '<thead><tr><th style="min-width:80px;text-align:left;padding-left:8px">Zona</th>';
    for(let i=1;i<=TOTAL_WEEKS;i++) html+=`<th id="gh-${i}">S${i}</th>`;
    html+='</tr></thead><tbody>';
    projectData.forEach((row,ri)=>{
        html+=`<tr><td class="zone-cell">${row.emoji} Z${ri+1}</td>`;
        row.tasks.forEach((_,ci)=>{html+=`<td id="gc-${ri}-${ci+1}">${row.tasks[ci]}</td>`;});
        html+='</tr>';
    });
    html+='</tbody>';
    t.innerHTML=html;
}

// ══════════════════════════════════════
// MAIN UPDATE
// ══════════════════════════════════════
function updateDashboard() {
    const slider = document.getElementById('weekSlider');
    slider.style.setProperty('--pct', ((currentWeek-1)/(TOTAL_WEEKS-1)*100)+'%');
    document.getElementById('weekBadge').textContent = `Sem ${currentWeek}`;
    const reportWeekLabel = document.getElementById('reportWeekLabel');
    if (reportWeekLabel) reportWeekLabel.textContent = `Semana ${currentWeek}`;
    updateWeekDots();
    updateGantt();
    if(currentTab==='tareas') renderTareas();
    else if(currentTab==='detalle') renderDetalle();
    else if(currentTab==='avance') renderAvance();

    // Refrescar notas si es Master
    if(session && session.role==='master') loadWeeklyNotes();
}

function updateWeekDots() {
    for(let i=1;i<=TOTAL_WEEKS;i++){
        const d=document.getElementById(`dot-${i}`);
        if(d) d.className='week-dot'+(i===currentWeek?' active':i<currentWeek?' past':'');
    }
}

function updateGantt() {
    for(let i=1;i<=TOTAL_WEEKS;i++){
        const th=document.getElementById(`gh-${i}`);
        if(th) th.className=i===currentWeek?'active-col':'';
    }
    projectData.forEach((row,ri)=>{
        row.tasks.forEach((_,ci)=>{
            const w=ci+1;
            const cell=document.getElementById(`gc-${ri}-${w}`);
            if(!cell) return;
            const prog=row.progress[w-1];
            if(w===currentWeek){
                cell.className='cell-active';
                cell.style.background=`linear-gradient(90deg,rgba(245,158,11,0.5) ${prog}%,rgba(245,158,11,0.08) ${prog}%)`;
            } else if(w<currentWeek){
                cell.className='cell-done'; cell.style.background='';
            } else {
                cell.className='cell-future'; cell.style.background='';
            }
        });
    });
}

// ══════════════════════════════════════
// RENDER VIEWS
// ══════════════════════════════════════
function getVisibleZones() {
    return projectData.map((d,i)=>({data:d,idx:i}));
}

function renderTareas() {
    const zones = getVisibleZones();
    const canEdit = session.role==='master';

    // Stats
    const avgP = Math.round(zones.reduce((s,z)=>s+z.data.progress[currentWeek-1],0)/zones.length);
    document.getElementById('statsGrid').innerHTML=`
        <div class="stat-card animate-in"><div class="stat-value">${currentWeek}</div><div class="stat-label">Semana</div></div>
        <div class="stat-card animate-in"><div class="stat-value" style="color:var(--accent2)">${avgP}%</div><div class="stat-label">Avance prom.</div></div>
        <div class="stat-card animate-in"><div class="stat-value" style="color:var(--accent3)">${currentWeek-1}</div><div class="stat-label">Semanas completas</div></div>
        <div class="stat-card animate-in"><div class="stat-value" style="color:#8b5cf6">${TOTAL_WEEKS-currentWeek}</div><div class="stat-label">Semanas restantes</div></div>
    `;

    document.getElementById('clientZoneHeader').style.display='none';

    let html='';
    zones.forEach(({data:row,idx},i)=>{
        const taskName = row.tasks[currentWeek-1] || 'S/A';
        const prog  = row.progress[currentWeek-1];
        const color = ZONE_COLORS[idx];
        const sliderHtml = canEdit
            ? `<div class="edit-slider-row" style="justify-content:space-between">
                 <label>Modificar avance:</label>
                 <div style="display:flex;gap:6px">
                     <button class="btn-prog" onclick="stepProgress(${idx}, -5)">- 5%</button>
                     <button class="btn-prog" onclick="stepProgress(${idx}, 5)">+ 5%</button>
                 </div>
               </div>`
            : ``;
        const uploadHtml = canEdit
            ? `<button class="btn-upload-foto" onclick="triggerFotoUpload(${idx})">📷 + Foto</button>
               <div class="upload-progress" id="up-prog-${idx}"></div>`
            : '';
        html+=`
        <div class="zone-card animate-in" style="animation-delay:${i*0.05}s">
            <div style="position:absolute;left:0;top:0;bottom:0;width:4px;border-radius:4px 0 0 4px;background:${color}"></div>
            <div class="zone-card-header">
                <div class="zone-name-text">${row.emoji} ${row.zone}</div>
                <div class="zone-pct-badge" style="color:${color};background:${color}22" id="pv-${idx}">${prog}%</div>
            </div>
            <div class="zone-last-update">Actualizado esta semana</div><span class="task-chip">${taskName}</span>
            <div class="progress-bar-wrap">
                <div class="progress-track"><div class="progress-fill" id="pf-${idx}" style="--pct:${prog}%;background:linear-gradient(90deg,${color},${color}88)"></div></div>
                <div class="progress-pct" style="color:${color}" id="pct-${idx}">${prog}%</div>
            </div>
            ${sliderHtml}
            ${uploadHtml}
            <div id="gallery-${idx}"></div>
        </div>`;
    });
    document.getElementById('zoneCards').innerHTML=html;
    // Cargar galerias de fotos async
    getVisibleZones().forEach(({idx}) => loadFotosGallery(idx, currentWeek, 'gallery-' + idx));
}

function renderDetalle() {
    document.getElementById('detailTitle').textContent=`Órdenes de trabajo · Semana ${currentWeek}`;
    const zones = getVisibleZones();
    const canEdit = session.role==='master';
    let html='';
    zones.forEach(({data:row,idx},i)=>{
        const taskName = row.tasks[currentWeek-1] || 'S/A';
        const prog=row.progress[currentWeek-1];
        const color=ZONE_COLORS[idx];
        const sliderHtml = canEdit
            ? `<div class="edit-slider-row" style="justify-content:space-between">
                 <label>Modificar avance:</label>
                 <div style="display:flex;gap:6px">
                     <button class="btn-prog" onclick="stepProgress(${idx}, -5)">- 5%</button>
                     <button class="btn-prog" onclick="stepProgress(${idx}, 5)">+ 5%</button>
                 </div>
               </div>`
            : ``;
        const weekDetail = row.details[currentWeek-1] || {};
        const canCheck = session.role === 'master' || session.role === 'observer';
        const subtasksHtml = (weekDetail.subtasks || []).map(st => `
            <div class="subtask-item" ${canCheck ? 'onclick="this.classList.toggle(\'checked\')"' : ''} style="display:flex; align-items:center; gap:10px; margin-top:8px; padding:8px 12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); border-radius:10px; ${canCheck ? 'cursor:pointer;' : 'cursor:default;'} transition:all 0.2s;">
                <div class="subtask-check" style="width:18px; height:18px; border:2px solid ${color}; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <div class="subtask-check-inner" style="width:10px; height:10px; background:${color}; border-radius:50%; opacity:0; transform:scale(0.5); transition:all 0.2s;"></div>
                </div>
                <span style="font-size:0.8rem; color:#cbd5e1;">${st}</span>
            </div>
        `).join('');

        html+=`
        <div class="detail-card animate-in" style="animation-delay:${i*0.05}s;border-left:4px solid ${color}; padding-bottom:20px;">
            <div class="detail-card-zone">${row.zone}</div>
            <div class="detail-card-title">📌 ${taskName}</div>
            <div style="font-size:0.75rem; color:var(--muted); margin-bottom:12px; line-height:1.4;">${weekDetail.desc || ''}</div>
            
            <div style="margin-bottom:15px;">
                <div style="font-size:0.6rem; color:var(--muted); text-transform:uppercase; font-weight:800; letter-spacing:0.05em; margin-bottom:8px; opacity:0.6;">Avance de la zona:</div>
                <div class="progress-bar-wrap" style="margin-top:0;">
                    <div class="progress-track"><div class="progress-fill" id="dpf-${idx}" style="width:${prog}%;background:linear-gradient(90deg,${color},${color}88)"></div></div>
                    <div class="progress-pct" style="color:${color}" id="dpv-${idx}">${prog}%</div>
                </div>
            </div>

            ${sliderHtml}

            <div style="margin-top:15px; border-top:1px solid rgba(255,255,255,0.05); padding-top:15px;">
                <div style="font-size:0.6rem; color:var(--muted); text-transform:uppercase; font-weight:800; letter-spacing:0.05em; margin-bottom:10px; opacity:0.6;">Lista de conceptos (Checklist):</div>
                ${subtasksHtml || '<div style="font-size:0.7rem; color:var(--muted); font-style:italic;">No hay conceptos desglosados para esta semana</div>'}
            </div>

            <div id="dgallery-${idx}" style="margin-top:15px;"></div>
        </div>`;
    });
    document.getElementById('detailCards').innerHTML=html;
    // Cargar galerias en tab Detalle
    getVisibleZones().forEach(({idx}) => loadFotosGallery(idx, currentWeek, 'dgallery-' + idx, true));
}

function renderAvance() {
    const zones = getVisibleZones();
    let html='';
    zones.forEach(({data:row,idx},i)=>{
        const color=ZONE_COLORS[idx];
        const overall=Math.round(row.progress[currentWeek-1] || 0);
        let pips='';
        for(let w=1;w<=TOTAL_WEEKS;w++){
            const p=row.progress[w-1];
            const h=Math.max(3,(p/100)*26);
            pips+=`<div class="week-pip ${w===currentWeek?'pip-current':''}" title="Sem ${w}: ${p}%">
                <span class="week-pip-num">${w}</span>
                <div class="week-pip-fill" style="height:${h}px;background:linear-gradient(180deg,${color},${color}66)"></div>
            </div>`;
        }
        html+=`<div class="summary-zone animate-in" style="animation-delay:${i*0.06}s;border-left:4px solid ${color}">
            <div class="summary-zone-name">${row.emoji} ${row.zone}<span style="color:${color};float:right">${overall}% global</span></div>
            <div class="week-progress-grid">${pips}</div>
        </div>`;
    });
    document.getElementById('avanceContent').innerHTML=html;
}

function renderDocumentos() {
    const container = document.getElementById('documentosContent');
    if (!currentObra.documentos || currentObra.documentos.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted)">No hay documentos disponibles para esta obra.</div>';
        return;
    }
    
    let html = '';
    currentObra.documentos.forEach((doc, i) => {
        html += `
        <a href="${doc.ruta}" target="_blank" style="text-decoration:none; display:block; animation-delay:${i*0.05}s;" class="animate-in">
            <div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px; display:flex; align-items:center; gap:14px; transition:all 0.2s; cursor:pointer; margin-bottom:10px;" onmouseover="this.style.borderColor='var(--accent)';" onmouseout="this.style.borderColor='var(--border)';">
                <div style="background:rgba(239,68,68,0.15); color:#ef4444; width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.2rem; flex-shrink:0;">📄</div>
                <div style="flex:1; overflow:hidden;">
                    <div style="font-size:0.9rem; font-weight:700; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${doc.nombre.replace('.pdf','')}</div>
                    <div style="font-size:0.65rem; color:var(--muted); margin-top:3px; text-transform:uppercase; letter-spacing:0.05em;">Documento PDF</div>
                </div>
                <div style="color:var(--accent); font-size:1.1rem; flex-shrink:0;">→</div>
            </div>
        </a>
        `;
    });
    container.innerHTML = html;
}

// ══════════════════════════════════════
// ACTIONS
// ══════════════════════════════════════
// (updateProgress moved above with logCambio)


function changeWeek(delta) {
    currentWeek = Math.min(TOTAL_WEEKS,Math.max(1,currentWeek+delta));
    updateDashboard();
}

function switchTab(tabId, btn) {
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    document.getElementById('view-'+tabId).classList.add('active');
    btn.classList.add('active');
    currentTab=tabId;
    if(tabId==='tareas') renderTareas();
    else if(tabId==='gantt') updateGantt();
    else if(tabId==='detalle') renderDetalle();
    else if(tabId==='avance') renderAvance();
    else if(tabId==='documentos') renderDocumentos();
    else if(tabId==='accesos') renderAccesos();
    else if(tabId==='reportes') cargarHistorialReportes();
}

// ══════════════════════════════════════
// ASISTENTE DE INSTALACIÓN (PWA)
// ══════════════════════════════════════
// let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[SYD] Evento beforeinstallprompt capturado');
});

function showInstallInstructions() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAndroid = /Android/.test(navigator.userAgent);
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    if (isPWA) {
        alert('✅ Ya estás usando la aplicación instalada.');
        return;
    }

    const modalId = 'installModal';
    const oldModal = document.getElementById(modalId);
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = modalId;
    modal.style.cssText = `
        position:fixed; inset:0; z-index:1000000;
        background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center;
        padding:20px; font-family:sans-serif; backdrop-filter:blur(8px);
    `;

    const card = document.createElement('div');
    card.style.cssText = `
        background:#fff; border-radius:28px; width:100%; max-width:360px;
        padding:32px 24px; color:#1e293b; text-align:center; position:relative;
        box-shadow:0 20px 60px rgba(0,0,0,0.5);
    `;

    let content = '';
    if (isIOS) {
        content = `
            <div style="font-size:3rem; margin-bottom:15px;">🍏</div>
            <h3 style="margin:0 0 10px; font-size:1.3rem;">Instalar en iPhone</h3>
            <p style="font-size:0.9rem; color:#64748b; margin-bottom:24px;">Sigue estos 3 pasos para tener SYD en tu pantalla de inicio:</p>
            
            <div style="text-align:left; display:flex; flex-direction:column; gap:16px; margin-bottom:24px;">
                <div style="display:flex; align-items:center; gap:15px;">
                    <div style="background:#f1f5f9; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; flex-shrink:0;">1</div>
                    <div style="font-size:0.9rem;">Pulsa el botón <strong>Compartir</strong> <img src="https://img.icons8.com/ios/50/000000/share-rounded.png" style="width:18px; vertical-align:middle;"> (en la barra inferior).</div>
                </div>
                <div style="display:flex; align-items:center; gap:15px;">
                    <div style="background:#f1f5f9; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; flex-shrink:0;">2</div>
                    <div style="font-size:0.9rem;">Desliza hacia abajo y busca <strong>"Añadir a pantalla de inicio"</strong>.</div>
                </div>
                <div style="display:flex; align-items:center; gap:15px;">
                    <div style="background:#f1f5f9; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; flex-shrink:0;">3</div>
                    <div style="font-size:0.9rem;">Pulsa <strong>"Añadir"</strong> en la esquina superior derecha.</div>
                </div>
            </div>
        `;
    } else if (deferredPrompt) {
        content = `
            <div style="font-size:3rem; margin-bottom:15px;">🤖</div>
            <h3 style="margin:0 0 10px; font-size:1.3rem;">Instalar App</h3>
            <p style="font-size:0.9rem; color:#64748b; margin-bottom:24px;">Pulsa el botón de abajo para instalar SYD en tu Android.</p>
            <button id="nativeInstallBtn" style="width:100%; background:#3b82f6; color:#fff; border:none; padding:15px; border-radius:14px; font-weight:700; font-size:1rem; cursor:pointer; margin-bottom:15px;">
                INSTALAR AHORA
            </button>
        `;
    } else {
        content = `
            <div style="font-size:3rem; margin-bottom:15px;">🌐</div>
            <h3 style="margin:0 0 10px; font-size:1.3rem;">Añadir a Pantalla</h3>
            <p style="font-size:0.9rem; color:#64748b; margin-bottom:24px;">Pulsa en los 3 puntos (Menú) de tu navegador y busca <strong>"Añadir a pantalla de inicio"</strong> o <strong>"Instalar aplicación"</strong>.</p>
        `;
    }

    card.innerHTML = content + `
        <button onclick="document.getElementById('${modalId}').remove()" style="width:100%; background:#f1f5f9; color:#64748b; border:none; padding:12px; border-radius:14px; font-weight:600; font-size:0.9rem; cursor:pointer;">
            Entendido, cerrar
        </button>
    `;

    modal.appendChild(card);
    document.body.appendChild(modal);

    const nativeBtn = document.getElementById('nativeInstallBtn');
    if (nativeBtn && deferredPrompt) {
        nativeBtn.onclick = async () => {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`[SYD] Usuario eligió instalar: ${outcome}`);
            deferredPrompt = null;
            document.getElementById(modalId).remove();
        };
    }
}



// ══════════════════════════════════════
// BOOT
// ══════════════════════════════════════
window.onload = async function() {
    await loadGlobalData(); // Cargar catálogo de obras

    const saved = localStorage.getItem('sauces_session');
    if(saved) {
        try {
            session = JSON.parse(saved);
            if(session.obra) {
                if(await loadProjectData(session.obra)) {
                    launchApp();
                    return;
                }
            } else if(session.role === 'master' || session.role === 'observer') {
                showObraSelector();
                return;
            }
        } catch(e) { localStorage.removeItem('sauces_session'); }
    }
    // Si no hay sesion guardada, mostrar login
    document.getElementById('loginScreen').style.display='flex';
    setupLoginNavigation();
};

function setupLoginNavigation() {
    const ids = ['loginName', 'loginPhone', 'loginEmail', 'loginPassword', 'loginCode'];
    ids.forEach((id, idx) => {
        const el = document.getElementById(id);
        if(!el) return;
        el.addEventListener('keydown', (e) => {
            if(e.key === 'Enter') {
                e.preventDefault();
                let nextIdx = idx + 1;
                while(nextIdx < ids.length) {
                    const nextEl = document.getElementById(ids[nextIdx]);
                    if(nextEl && isElementVisible(nextEl)) {
                        nextEl.focus();
                        return;
                    }
                    nextIdx++;
                }
                doAuthAction();
            }
        });
    });
}

function isElementVisible(el) {
    let curr = el;
    while(curr && curr !== document.body) {
        if(window.getComputedStyle(curr).display === 'none') return false;
        curr = curr.parentElement;
    }
    return true;
}


let recognition = null;
let weeklyNotes = [];
let GEMINI_API_KEY = localStorage.getItem('syd_gemini_key') || '';

// Cargar la key desde Firebase (persiste entre dispositivos y modos incógnito)
async function loadGeminiKeyFromFirebase() {
    try {
        const doc = await db.collection('config').doc('gemini').get();
        if (doc.exists && doc.data().apiKey) {
            GEMINI_API_KEY = doc.data().apiKey;
            localStorage.setItem('syd_gemini_key', GEMINI_API_KEY); // sincronizar local
            console.log('[SYD] ✅ Gemini key cargada desde Firebase');
        }
    } catch(e) {
        console.log('[SYD] Gemini key desde localStorage (Firebase no disponible)');
    }
}

function toggleGeminiConfig() {
    const area = document.getElementById('geminiConfigArea');
    if (!area) return;
    area.style.display = area.style.display === 'none' ? 'block' : 'none';
    if (area.style.display === 'block') {
        document.getElementById('geminiKeyInput').value = GEMINI_API_KEY;
    }
}

async function saveGeminiKeyInline() {
    const key = document.getElementById('geminiKeyInput').value.trim();
    if (!key) { alert('⚠️ La clave no puede estar vacía.'); return; }
    GEMINI_API_KEY = key;
    // Guardar en localStorage (respaldo local)
    localStorage.setItem('syd_gemini_key', GEMINI_API_KEY);
    // Guardar en Firebase (persiste en todos los dispositivos y sesiones)
    try {
        await db.collection('config').doc('gemini').set({ apiKey: key, updatedAt: new Date().toISOString() });
        alert('✅ Clave de IA guardada (Firebase + local). No se perderá al actualizar.');
    } catch(e) {
        alert('✅ Clave guardada localmente.\n⚠️ No se pudo guardar en Firebase: ' + e.message);
    }
    document.getElementById('geminiConfigArea').style.display = 'none';
}


function initSpeech() {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) return;
    recognition = new Speech();
    recognition.lang = 'es-MX';
    recognition.onstart = () => {
        document.getElementById('dictarIcon').textContent = '🛑';
        document.getElementById('dictarText').textContent = 'Grabando...';
        document.getElementById('dictationStatus').style.display = 'block';
    };
    recognition.onresult = (e) => {
        const text = e.results[0][0].transcript;
        saveWeeklyNote(text);
    };
    recognition.onend = () => {
        document.getElementById('dictarIcon').textContent = '🎙️';
        document.getElementById('dictarText').textContent = 'Dictar Nota';
        document.getElementById('dictationStatus').style.display = 'none';
    };
}

function startDictation() {
    if (!recognition) initSpeech();
    if (!recognition) {
        addManualNote('Tu navegador no soporta dictado. Escribe tu nota aquí:');
        return;
    }
    try { recognition.start(); } catch(e) { recognition.stop(); }
}

function addManualNote(msg = 'Escribe tu nota sobre el avance:') {
    const text = prompt(msg);
    if (text && text.trim().length > 0) saveWeeklyNote(text.trim());
}

async function saveWeeklyNote(text) {
    if (!db || !session.obra) return;
    try {
        await db.collection('obras').doc(session.obra).collection('report_notes').add({
            semana: currentWeek,
            texto: text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            usuario: session.email || 'anonimo'
        });
        alert('✅ Nota guardada');
        loadWeeklyNotes();
    } catch(e) { alert('Error: ' + e.message); }
}

async function loadWeeklyNotes() {
    if (!db || !session.obra) return;
    // Cargar key de Gemini desde Firebase al inicio (no se pierde entre sesiones)
    await loadGeminiKeyFromFirebase();
    try {
        const snap = await db.collection('obras').doc(session.obra).collection('report_notes').where('semana', '==', currentWeek).get();
        let notesData = [];
        snap.forEach(doc => notesData.push({ id: doc.id, ...doc.data() }));
        notesData.sort((a, b) => (a.timestamp?.toMillis() || 0) - (b.timestamp?.toMillis() || 0));
        weeklyNotes = notesData.map(d => d.texto);
        
        let html = "";
        notesData.forEach(data => {
            html += `<div style="display:flex; justify-content:space-between; margin-bottom:8px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.05);">
                        <div style="flex:1;">• ${data.texto}</div>
                        <button onclick="deleteSingleNote('${data.id}')" style="background:none; border:none; color:#ef4444; cursor:pointer;">✕</button>
                    </div>`;
        });
        const preview = document.getElementById('notesPreview');
        if (preview) {
            preview.style.display = weeklyNotes.length > 0 ? 'block' : 'none';
            preview.innerHTML = html;
        }
        const counter = document.getElementById('noteCounter');
        if (counter) counter.textContent = `${weeklyNotes.length} nota(s)`;
    } catch(e) { console.error(e); }
}

async function deleteSingleNote(id) {
    if(!confirm('¿Borrar esta nota?')) return;
    await db.collection('obras').doc(session.obra).collection('report_notes').doc(id).delete();
    loadWeeklyNotes();
}

async function clearWeeklyNotes() {
    if(!confirm('¿Borrar todas las notas de esta semana?')) return;
    const snap = await db.collection('obras').doc(session.obra).collection('report_notes').where('semana', '==', currentWeek).get();
    const batch = db.batch();
    snap.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    loadWeeklyNotes();
}






function showReportModal(html, fileName, numFotos) {
    // Eliminar modal anterior si existe
    const old = document.getElementById('reportModal');
    if (old) old.remove();

    const ts = new Date();
    const name = fileName || `Reporte_SYD_S${currentWeek}_${ts.getDate()}${ts.getMonth()+1}${ts.getHours()}${ts.getMinutes()}`;

    // Contenedor de pantalla completa (no es ventana nueva)
    const modal = document.createElement('div');
    modal.id = 'reportModal';
    modal.style.cssText = `
        position:fixed; inset:0; z-index:99999;
        background:#fff; overflow-y:auto;
        font-family:Arial,Helvetica,sans-serif;
    `;

    // Barra superior de acciones
    const bar = document.createElement('div');
    bar.id = 'reportActionBar';
    bar.style.cssText = `
        position:sticky; top:0; z-index:10;
        background:#ffffff; color:#1e293b;
        padding:12px 15px; display:flex;
        align-items:center; justify-content:space-between;
        box-shadow:0 4px 15px rgba(0,0,0,0.08);
        border-bottom:1px solid #e2e8f0;
    `;
    bar.innerHTML = `<div style="display:flex; align-items:center; gap:10px;">
            <button onclick="document.getElementById('reportModal').remove()"
                style="background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;
                padding:8px 14px;border-radius:24px;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                <svg viewBox="0 0 24 24" style="width:18px;height:18px;margin-right:4px;fill:none;stroke:currentColor;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round"><path d="M15 18l-6-6 6-6"/></svg> <span class="hide-mobile">Regresar</span>
            </button>
        </div>
        <div style="display:flex; gap:10px;">
            <button onclick="saveReportEdits(this)"
                style="background:#f59e0b;color:#fff;border:none;padding:8px 14px;
                border-radius:24px;font-weight:700;font-size:14px;cursor:pointer;display:flex;align-items:center;box-shadow:0 2px 4px rgba(245,158,11,0.2);">
                💾 <span class="hide-mobile">Guardar</span>
            </button>
            <button onclick="window.print()"
                style="background:#fff;color:#2563eb;border:1px solid #bfdbfe;
                padding:8px 14px;border-radius:24px;font-weight:600;font-size:14px;cursor:pointer;display:flex;align-items:center;box-shadow:0 2px 4px rgba(37,99,235,0.05);">
                <svg viewBox="0 0 24 24" style="width:18px;height:18px;margin-right:4px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                <span class="hide-mobile">PDF</span>
            </button>
            <button onclick="sendReportWhatsApp()"
                style="background:#25D366;color:#fff;border:none;padding:8px 16px;
                border-radius:24px;font-weight:700;font-size:14px;cursor:pointer;display:flex;align-items:center;box-shadow:0 4px 10px rgba(37,211,102,0.3);">
                <svg viewBox="0 0 24 24" style="width:18px;height:18px;margin-right:6px;fill:#fff"><path d="M12.031 0C5.385 0 .001 5.382.001 12.028c0 2.124.553 4.195 1.604 6.015L.01 24l6.115-1.603a11.972 11.972 0 005.906 1.558h.005c6.645 0 12.028-5.382 12.028-12.028S18.676 0 12.031 0zm0 21.947h-.003a9.927 9.927 0 01-5.06-1.38l-.363-.215-3.766.988.997-3.673-.236-.376a9.932 9.932 0 01-1.52-5.263c0-5.485 4.464-9.95 9.95-9.95 2.658 0 5.158 1.036 7.037 2.915a9.924 9.924 0 012.912 7.034c-.001 5.486-4.467 9.951-9.953 9.951zm5.457-7.448c-.299-.15-1.768-.872-2.042-.972-.274-.1-.473-.15-.673.15-.199.3-.772.973-.946 1.173-.174.2-.348.225-.647.075-1.32-.663-2.39-1.226-3.32-2.825-.174-.3.018-.462.167-.611.134-.134.299-.35.449-.525.15-.175.2-.3.299-.5s.05-.375-.025-.525c-.075-.15-.673-1.625-.922-2.225-.243-.585-.49-.505-.673-.515-.174-.01-.374-.01-.573-.01-.2 0-.523.075-.797.375-.274.3-1.046 1.025-1.046 2.5s1.071 2.895 1.221 3.095c.15.2 2.112 3.22 5.114 4.516.715.31 1.272.495 1.706.635.717.228 1.37.195 1.884.118.577-.086 1.768-.722 2.017-1.422.25-.7.25-1.3.175-1.422-.075-.125-.274-.2-.573-.35z"/></svg> WhatsApp
            </button>
        </div>
    `;

    // Contenido del informe
    const content = document.createElement('div');
    content.innerHTML = html;

    modal.appendChild(bar);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // CSS para imprimir: ocultar la barra de acciones
    if (!document.getElementById('reportPrintStyle')) {
        const style = document.createElement('style');
        style.id = 'reportPrintStyle';
        style.textContent = `@media print { #reportActionBar { display:none !important; } }`;
        document.head.appendChild(style);
    }
}

async function generateReport() {
    const obraId = session.obra || 'sauces';
    if (weeklyNotes.length === 0) { alert('Agrega al menos una nota primero.'); return; }
    const btn = document.getElementById('btnReporte');
    const oldText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ Buscando fotos...';

    try {
        // 1. Buscar fotos de la obra (SIN filtro de semana para no perderse ninguna)
        const fotosSnap = await db.collection('obras').doc(obraId)
            .collection('fotos').orderBy('timestamp', 'desc').limit(8).get();
        const fotoUrls = [];
        fotosSnap.forEach(doc => fotoUrls.push(doc.data().url));
        console.log(`[SYD] Fotos encontradas en toda la obra: ${fotoUrls.length}`);

        const ts = new Date();
        const fileName = `Reporte_SYD_S${currentWeek}_${ts.getDate()}${ts.getMonth()+1}${ts.getHours()}${ts.getMinutes()}`;

        // 2. Datos por defecto (sin IA)
        // 2. Datos por defecto (sin IA)
        let reportData = {
            resumen: weeklyNotes.join(' '),
            avances: [...weeklyNotes],
            descripciones: fotoUrls.map((_, i) => `Vista de avance ${i + 1}`)
        };
        if (reportData.avances.length === 0) reportData.avances.push('Actividad de obra en proceso');

        // 3. Llamar a Gemini si hay API Key
        if (GEMINI_API_KEY) {
            btn.innerHTML = '🤖 IA Analizando imágenes...';
            try {
                // Prompt de texto — sin URLs (Gemini no puede descargarlas)
                const notasTexto = weeklyNotes.map((n, i) => `${i + 1}. ${n}`).join('\n');
                const prompt = `Actúa como el Director de Obra de SYD Constructores redactando un AVANCE DE OBRA SEMANAL para el propietario. El tono debe ser profesional, impecable y ejecutivo, pero con un lenguaje natural que un cliente adulto entienda sin necesidad de ser ingeniero.

TAREA: Redacta un reporte basado en las notas de campo del residente.

REGLAS DE VOCABULARIO Y ESTILO:
1. PROHIBIDO usar lenguaje robótico o traducciones literales como: "envoltura exterior", "envolvente", "aparatos sanitarios", "módulos de baño", "habilitación de elementos".
2. USA términos naturales de construcción en México: "Fachada", "Enjarres", "Firme de concreto", "Baños", "Instalación de muebles de baño", "Cancelería", "Carpintería", "Muros", "Pisos".
3. Describe lo VISUAL: Explica qué se ve en las fotos de forma clara. Ejemplo: "Se concluyó el detallado de pintura en la fachada principal".
4. Evita muletillas informales como: "todo listo", "ya quedó", "falta poco".
5. Mantén la formalidad (tercera persona) pero con calidez humana.

NOTAS DE CAMPO (Material de referencia):
${notasTexto}

CONTEXTO: Proyecto residencial de alta gama. Fase: ${currentObra?.name || 'Obra actual'}.

Devuelve ÚNICAMENTE este JSON sin markdown:
{"resumen":"[3 párrafos narrativos y profesionales]","avances":["[Lista de logros alcanzados]"],"descripciones":["[Exactamente ${fotoUrls.length} pies de foto descriptivos y claros]"]}`;

                // Construir partes del mensaje: texto + imágenes en Base64
                const parts = [{ text: prompt }];

                // Intentar convertir hasta 6 fotos a Base64 para enviarlas a Gemini
                let imgSent = 0;
                for (const url of fotoUrls.slice(0, 6)) {
                    const b64 = await getBase64ImageSafe(url);
                    if (b64) {
                        parts.push({ inlineData: { mimeType: 'image/jpeg', data: b64 } });
                        imgSent++;
                        console.log(`[SYD] 📸 Imagen ${imgSent} enviada a Gemini`);
                    } else {
                        console.warn('[SYD] No se pudo convertir imagen:', url);
                    }
                }
                console.log(`[SYD] Total imágenes enviadas a Gemini: ${imgSent} de ${fotoUrls.length}`);

                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: [{ parts }] })
                    }
                );
                const data = await response.json();
                console.log('[SYD] Gemini status:', response.status);
                console.log('[SYD] Respuesta cruda:', JSON.stringify(data).substring(0, 500));

                if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    const rawText = data.candidates[0].content.parts[0].text.trim();
                    const start = rawText.indexOf('{');
                    const end = rawText.lastIndexOf('}');
                    if (start !== -1 && end !== -1) {
                        const aiJson = JSON.parse(rawText.substring(start, end + 1));
                        if (aiJson.resumen) reportData.resumen = aiJson.resumen;
                        if (Array.isArray(aiJson.avances) && aiJson.avances.length > 0)
                            reportData.avances = aiJson.avances;
                        if (Array.isArray(aiJson.descripciones) && aiJson.descripciones.length > 0)
                            reportData.descripciones = aiJson.descripciones;
                        console.log('[SYD] ✅ IA generó el informe con análisis visual');
                    } else {
                        console.warn('[SYD] JSON no encontrado en respuesta:', rawText.substring(0, 200));
                    }
                } else if (data.error) {
                    console.error('[SYD] Error API Gemini:', data.error.message);
                    alert(`⚠️ Gemini: ${data.error.message}\n\nEl informe se generará sin IA.`);
                }
            } catch (aiErr) {
                console.error('[SYD] Error llamando Gemini:', aiErr);
            }
        }



        // 4. Cargar plantilla HTML
        btn.innerHTML = '📄 Generando PDF...';
        const templateResponse = await fetch('plantilla_syd.html');
        if (!templateResponse.ok) throw new Error('No se pudo cargar plantilla_syd.html');
        let html = await templateResponse.text();

        // 6. Rellenar variables de la plantilla
        const obraName = currentObra?.name || session.obra || 'PROYECTO';
        
        const today = new Date();
        const day = today.getDay();
        const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1); const monday = new Date(new Date(today).setDate(diffToMonday)); const saturday = new Date(new Date(today).setDate(diffToMonday + 5));
        const dateOptions = { day: '2-digit', month: 'long', timeZone: 'America/Mexico_City' };
        const dateOptsShort = { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Mexico_City' }; const periodoStr = `Del ${monday.toLocaleDateString('es-MX', dateOptsShort)} al ${saturday.toLocaleDateString('es-MX', dateOptsShort)}`;

        html = html
            .replace('{{proyecto_nombre}}', obraName.toUpperCase())
            .replace('{{fecha_informe}}', new Date().toLocaleDateString('es-MX', dateOptsShort))
            .replace('{{periodo_semana}}', periodoStr)
            .replace('{{resumen_ejecutivo}}', reportData.resumen);

        // 7. Insertar avances (Sección 2)
        let listaTrabajosHtml = '';
        reportData.avances.forEach(av => {
            listaTrabajosHtml += `<li contenteditable="true" style="outline:none;">${av}</li>`;
        });
        html = html.replace('{{lista_trabajos}}', listaTrabajosHtml);

        // 8. Insertar Avances por Zona (Sección 4)
        let avancesZonasHtml = '';
        const zonesData = getVisibleZones();
        zonesData.forEach(({data:row}) => {
            const overall = Math.round(row.progress[currentWeek-1] || 0);
            avancesZonasHtml += `<li contenteditable="true" style="outline:none;"><strong>${row.zone}:</strong> ${overall}% de avance acumulado</li>`;
        });
        html = html.replace('{{avance_zonas}}', avancesZonasHtml);

        // 9. Insertar Fotos Dinámicas (Sección 3)
        let fotosHtml = '';
        fotoUrls.forEach((url, i) => {
            const desc = reportData.descripciones[i] || `Vista de avance ${i+1}`;
            fotosHtml += `
            <div class="photo-item">
                <div class="photo-image-container">
                    <img src="${url}" alt="Evidencia ${i+1}">
                </div>
                <p class="photo-caption" contenteditable="true" style="outline:none;"><strong>Foto ${i+1}:</strong> ${desc}</p>
            </div>`;
        });
        html = html.replace('{{fotos_dinamicas}}', fotosHtml);

        // 8. Mostrar el informe en un modal de pantalla completa (sin window.open)
        window._lastReportHtml = html; // Guardar para Modal/PDF
        showReportModal(html, fileName, fotoUrls.length);

        // PRE-SUBIDA: Guardar en Firestore para obtener el ID de edición
        window._lastReportLink = '';
        window._lastReportDocId = null;
        try {
            // Guardamos el html tal cual (ya no tiene Base64, así que es ligero)
            const docRef = await db.collection('informes_compartidos').add({
                obra: obraId,
                semana: currentWeek,
                creado: firebase.firestore.FieldValue.serverTimestamp(),
                html: window._lastReportHtml
            });
            window._lastReportDocId = docRef.id;
            const baseUrl = window.location.href.split('?')[0].replace('index.html', '');
            window._lastReportLink = `${baseUrl}view_report.html?id=${docRef.id}`;
            console.log('[SYD] Informe base guardado en Firestore:', window._lastReportLink);
        } catch(e) {
            console.warn('[SYD] Error guardando informe base en Firestore:', e);
        }
    } catch (e) {
        console.error('[SYD] Error generateReport:', e);
        alert('Error al generar reporte: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = oldText;
    }
}

// ══ Envio de Informe por WhatsApp ══
function forceUpdateApp() {
    if (confirm('¿Quieres forzar la descarga de la última versión?\nEsto limpiará el caché y reiniciará la app.')) {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for(let registration of registrations) { registration.unregister(); }
                window.location.reload(true);
            });
        } else {
            window.location.reload(true);
        }
    }
}

async function saveReportEdits(btnElement) {
    if (!db) { alert('No hay conexión con la base de datos.'); return false; }
    const oldText = btnElement ? btnElement.innerHTML : '';
    if (btnElement) {
        btnElement.innerHTML = '⏳ Guardando...';
        btnElement.disabled = true;
    }
    try {
        const modalContentWrap = document.querySelector('#reportModal > div:nth-child(2)');
        if (modalContentWrap) {
            let cleanHtml = modalContentWrap.innerHTML;
            cleanHtml = cleanHtml.replace(/contenteditable="true"/g, '');
            cleanHtml = cleanHtml.replace(/style="outline:none;"/g, '');
            
            if (window._lastReportDocId) {
                await db.collection('informes_compartidos').doc(window._lastReportDocId).update({
                    html: cleanHtml
                });
            } else {
                const docRef = await db.collection('informes_compartidos').add({
                    obra: session.obra,
                    semana: window._lastReportWeek || currentWeek,
                    creado: firebase.firestore.FieldValue.serverTimestamp(),
                    html: cleanHtml
                });
                window._lastReportDocId = docRef.id;
                const baseUrl = window.location.href.split('?')[0].replace('index.html', '');
                window._lastReportLink = `${baseUrl}view_report.html?id=${docRef.id}`;
            }
            console.log('[SYD] Ediciones guardadas manualmente.');
            if (btnElement) {
                btnElement.innerHTML = '✅ Guardado';
                setTimeout(() => { btnElement.innerHTML = oldText; btnElement.disabled = false; }, 2000);
            }
            return true;
        }
    } catch(e) {
        console.error('Error guardando ediciones:', e);
        if (btnElement) {
            btnElement.innerHTML = '❌ Error';
            setTimeout(() => { btnElement.innerHTML = oldText; btnElement.disabled = false; }, 2000);
        }
        alert('Error al guardar: ' + e.message);
    }
    return false;
}

async function showReportHistory() {
    if (!db) { alert('Firebase no conectado.'); return; }
    const obraId = session.obra;
    if (!obraId) { alert('No hay obra seleccionada.'); return; }

    const modal = document.createElement('div');
    modal.id = 'historyModal';
    modal.style.cssText = `position:fixed; inset:0; z-index:100000; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; padding:20px;`;
    
    const container = document.createElement('div');
    container.style.cssText = `background:#fff; width:100%; max-width:500px; max-height:80vh; border-radius:24px; padding:24px; overflow-y:auto; position:relative; box-shadow:0 20px 50px rgba(0,0,0,0.5);`;
    
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid #eee; padding-bottom:15px;">
            <h3 style="margin:0; font-size:1.2rem; color:#1e293b;">📅 Historial de Reportes</h3>
            <button onclick="document.getElementById('historyModal').remove()" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:#94a3b8;">&times;</button>
        </div>
        <div id="historyList" style="display:flex; flex-direction:column; gap:12px;">
            <div style="text-align:center; padding:20px; color:#64748b;">Cargando historial...</div>
        </div>
    `;
    
    modal.appendChild(container);
    document.body.appendChild(modal);
    
    try {
        const snap = await db.collection('informes_compartidos')
            .where('obra', '==', obraId)
            .get();
        
        const list = document.getElementById('historyList');
        if (snap.empty) {
            list.innerHTML = '<div style="text-align:center; padding:20px; color:#64748b;">No se han generado reportes aún.</div>';
            return;
        }
        
        let docs = [];
        snap.forEach(doc => docs.push(doc));
        docs.sort((a, b) => {
            const timeA = a.data().creado ? a.data().creado.toDate().getTime() : 0;
            const timeB = b.data().creado ? b.data().creado.toDate().getTime() : 0;
            return timeB - timeA;
        });
        
        let html = '';
        docs.forEach(doc => {
            const data = doc.data();
            const date = data.creado ? data.creado.toDate().toLocaleDateString('es-MX', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}) : 'Sin fecha';
            const baseUrl = window.location.href.split('?')[0].replace('index.html', '');
            const link = `${baseUrl}view_report.html?id=${doc.id}`;
            
            html += `
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
                    <div style="flex:1;">
                        <div style="font-weight:700; color:#1e293b; font-size:0.85rem;">Semana ${data.semana || '?'}</div>
                        <div style="font-size:0.7rem; color:#64748b;">${date}</div>
                    </div>
                    <div style="display:flex; gap:6px; flex-shrink:0;">
                        <a href="${link}" target="_blank" style="background:#2563eb; color:#fff; text-decoration:none; padding:6px 10px; border-radius:8px; font-size:0.7rem; font-weight:700;">Ver</a>
                        <button onclick="reenviarReporte('${doc.id}', ${data.semana || 1}, '${link}', this)" style="background:#10b981; color:#fff; border:none; padding:6px 10px; border-radius:8px; font-size:0.7rem; font-weight:700; cursor:pointer;">Reenviar</button>
                        <button onclick="deleteReport('${doc.id}', this)" style="background:#ef4444; color:#fff; border:none; padding:6px 10px; border-radius:8px; font-size:0.7rem; font-weight:700; cursor:pointer;">Eliminar</button>
                    </div>
                </div>
            `;
        });
        list.innerHTML = html;
    } catch (e) {
        console.error('[SYD] Error cargando historial:', e);
        document.getElementById('historyList').innerHTML = `<div style="color:#ef4444; padding:20px; text-align:center;">Error: ${e.message}</div>`;
    }
}

async function deleteReport(id, btn) {
    if (!confirm('¿Estás seguro de que deseas eliminar este reporte permanentemente?\\nEl link compartido dejará de funcionar.')) return;
    
    btn.innerHTML = '...';
    btn.disabled = true;
    try {
        await db.collection('informes_compartidos').doc(id).delete();
        btn.closest('div').parentElement.remove();
        if (document.getElementById('historyList').children.length === 0) {
            document.getElementById('historyList').innerHTML = '<div style="text-align:center; padding:20px; color:#64748b;">No se han generado reportes aún.</div>';
        }
    } catch (e) {
        alert('Error al eliminar: ' + e.message);
        btn.innerHTML = 'Eliminar';
        btn.disabled = false;
    }
}

async function sendReportWhatsApp() {
    if (!db) { alert('Firebase no está conectado.'); return; }
    const obraId = session.obra;
    if (!obraId) { alert('No hay obra seleccionada.'); return; }

    const btn = document.querySelector('#reportActionBar button[onclick="sendReportWhatsApp()"]');
    let oldBtnText = '';
    if (btn) {
        oldBtnText = btn.innerHTML;
        btn.innerHTML = '⏳ Guardando...';
        btn.disabled = true;
    }

    try {
        console.log('[SYD] Iniciando envío WhatsApp...');

        // 1. Guardar las ediciones en Firestore (ahora usa la función independiente)
        await saveReportEdits();

        // 2. Buscar clientes (Usamos un timeout para que no se quede colgado)
        const fetchPromise = db.collection('clientes').get();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado')), 10000));
        
        const snap = await Promise.race([fetchPromise, timeoutPromise]);
        const clientMap = {};
        
        snap.forEach(doc => {
            const d = doc.data();
            // Filtramos manualmente por obraId para evitar problemas de índices en Firebase
            if (d.obra === obraId && d.telefono && d.nombre) {
                const phone = d.telefono.replace(/[^\d+]/g, '');
                if (phone) clientMap[phone] = d.nombre;
            }
        });

        const clients = Object.entries(clientMap);
        console.log('[SYD] Clientes encontrados:', clients.length);

        if (clients.length === 0) {
            alert('⚠️ No se encontraron clientes registrados en esta obra.\n\nVe a la sección de "Registro de Accesos" para verificar.');
            btn.innerHTML = oldBtnText; btn.disabled = false;
            return;
        }

        // 2. Asegurar que el link del informe esté listo
        let finalLink = window._lastReportLink;
        if (!finalLink && window._lastReportHtml) {
            btn.innerHTML = '⏳ Subiendo informe...';
            try {
                const uploadPromise = db.collection('informes_compartidos').add({
                    obra: obraId,
                    semana: window._lastReportWeek || currentWeek,
                    creado: firebase.firestore.FieldValue.serverTimestamp(),
                    html: window._lastReportHtml
                });
                const uploadTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de subida')), 8000));
                
                const docRef = await Promise.race([uploadPromise, uploadTimeout]);
                const baseUrl = window.location.href.split('?')[0].replace('index.html', '');
                finalLink = `${baseUrl}view_report.html?id=${docRef.id}`;
                window._lastReportLink = finalLink; // Guardar para futuro
            } catch(e) { 
                console.warn('Error guardando en Firestore:', e); 
            }
        }

        if (!finalLink) {
            alert('⚠️ El enlace web del informe no pudo generarse. Se enviará el mensaje sin el link. Verifica tu conexión e inténtalo de nuevo si deseas adjuntarlo.');
        }

        const reportLink = finalLink;
        const hour = new Date().getHours();
        const saludo = hour < 12 ? 'Buenos días' : 'Buenas tardes';
        const obraName = currentObra?.name || obraId;
        const semana = window._lastReportWeek || currentWeek;
        const fecha = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });

        btn.innerHTML = oldBtnText;
        btn.disabled = false;

        // 3. INICIAR FLUJO SECUENCIAL (Opción C)
        window._waQueue = clients;
        window._waIndex = 0;
        window._waActive = true;
        
        // Guardar cola de envíos en localStorage para resistir suspensiones o recargas del PWA
        localStorage.setItem('syd_wa_queue', JSON.stringify(clients));
        localStorage.setItem('syd_wa_index', '0');
        localStorage.setItem('syd_wa_active', 'true');
        localStorage.setItem('syd_wa_saludo', saludo);
        localStorage.setItem('syd_wa_obraname', obraName);
        localStorage.setItem('syd_wa_semana', semana.toString());
        localStorage.setItem('syd_wa_fecha', fecha);
        localStorage.setItem('syd_wa_reportlink', reportLink || '');
        
        const modalId = 'waSequentialModal';
        const oldModal = document.getElementById(modalId);
        if (oldModal) oldModal.remove();

        const modal = document.createElement('div');
        modal.id = modalId;
        modal.style.cssText = `
            position:fixed; inset:0; z-index:100000;
            background:rgba(0,0,0,0.9); display:flex; align-items:center; justify-content:center;
            padding:20px; font-family:sans-serif; backdrop-filter:blur(10px);
        `;

        const card = document.createElement('div');
        card.id = 'waSequentialCard';
        card.style.cssText = `
            background:#1e293b; border-radius:24px; width:100%; max-width:360px;
            padding:32px 24px; color:#fff; text-align:center; box-shadow:0 25px 50px rgba(0,0,0,0.5);
            border:1px solid rgba(255,255,255,0.1);
        `;
        
        modal.appendChild(card);
        document.body.appendChild(modal);

        window._updateWAModal = function() {
            const idx = window._waIndex;
            const total = window._waQueue.length;
            
            if (idx >= total) {
                // Cola terminada: limpiar localStorage
                localStorage.removeItem('syd_wa_queue');
                localStorage.removeItem('syd_wa_index');
                localStorage.removeItem('syd_wa_active');
                localStorage.removeItem('syd_wa_saludo');
                localStorage.removeItem('syd_wa_obraname');
                localStorage.removeItem('syd_wa_semana');
                localStorage.removeItem('syd_wa_fecha');
                localStorage.removeItem('syd_wa_reportlink');

                card.innerHTML = `
                    <div style="font-size:3rem; margin-bottom:15px;">✅</div>
                    <div style="font-size:1.4rem; font-weight:800; margin-bottom:10px;">¡Todo enviado!</div>
                    <div style="font-size:0.9rem; color:#94a3b8; margin-bottom:24px;">Se han procesado los ${total} clientes de la lista.</div>
                    <button onclick="window._waActive=false; document.getElementById('${modalId}').remove()" style="width:100%; background:var(--accent); color:#fff; border:none; padding:15px; border-radius:14px; font-weight:700; font-size:1rem; cursor:pointer;">
                        Finalizar y Cerrar
                    </button>
                `;
                return;
            }

            const [phone, nombre] = window._waQueue[idx];
            const pct = Math.round(((idx) / total) * 100);
            
            card.innerHTML = `
                <div style="font-size:0.75rem; color:var(--accent2); font-weight:800; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:8px;">
                    Envío Secuencial (${idx + 1} de ${total})
                </div>
                <div style="height:6px; background:rgba(255,255,255,0.1); border-radius:3px; margin-bottom:24px; overflow:hidden;">
                    <div style="width:${pct}%; height:100%; background:var(--accent2); transition:width 0.3s;"></div>
                </div>
                
                <div style="margin-bottom:24px;">
                    <div style="font-size:0.8rem; color:#94a3b8; margin-bottom:4px;">Enviar informe a:</div>
                    <div style="font-size:1.3rem; font-weight:800; color:#fff;">${nombre.toUpperCase()}</div>
                    <div style="font-size:0.9rem; color:var(--accent); font-weight:600; margin-top:4px;">${phone}</div>
                </div>

                <button onclick="window._sendCurrentWA()" style="width:100%; background:#25d366; color:#fff; border:none; padding:18px; border-radius:16px; font-weight:800; font-size:1.1rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; box-shadow:0 10px 20px rgba(37,211,102,0.2); margin-bottom:16px;">
                    <span>📱 ENVIAR AHORA</span>
                </button>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <button onclick="window._waIndex++; localStorage.setItem('syd_wa_index', window._waIndex.toString()); window._updateWAModal()" style="background:rgba(255,255,255,0.05); color:#94a3b8; border:none; padding:10px; border-radius:10px; font-size:0.8rem; font-weight:600; cursor:pointer;">
                        Omitir este
                    </button>
                    <button onclick="window._waActive=false; localStorage.removeItem('syd_wa_queue'); localStorage.removeItem('syd_wa_index'); localStorage.removeItem('syd_wa_active'); localStorage.removeItem('syd_wa_saludo'); localStorage.removeItem('syd_wa_obraname'); localStorage.removeItem('syd_wa_semana'); localStorage.removeItem('syd_wa_fecha'); localStorage.removeItem('syd_wa_reportlink'); document.getElementById('${modalId}').remove()" style="background:transparent; color:#64748b; border:none; padding:10px; font-size:0.8rem; cursor:pointer;">
                        Cancelar todo
                    </button>
                </div>
            `;
        };

        window._sendCurrentWA = function() {
            const [phone, nombre] = window._waQueue[window._waIndex];
            const firstName = nombre.split(' ')[0].toUpperCase();
            const emojiCalendar = '\uD83D\uDCC5';
            const emojiDoc = '\uD83D\uDCC4';
            const emojiEmail = '\uD83D\uDCE7';
            const emojiPhone = '\uD83D\uDCDE';

            const mensaje = `${saludo}, ${firstName}.

Le enviamos el informe semanal correspondiente a los trabajos realizados en su obra *${obraName}*.

${emojiCalendar} Semana ${semana} — ${fecha}
${reportLink ? `\n${emojiDoc} *Ver informe completo:*\n${reportLink}\n` : ''}
Cualquier duda o comentario estamos a sus órdenes.

_SYD Constructores_
${emojiEmail} info@sydconstructores.com.mx
${emojiPhone} 333 250 3313`;

            let tel = phone.replace(/[^\d]/g, '');
            if (tel.length === 10) tel = '52' + tel;

            window.open(`https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`, '_blank');
            
            // Avanzar al siguiente e indexar en localStorage
            window._waIndex++;
            localStorage.setItem('syd_wa_index', window._waIndex.toString());
            setTimeout(window._updateWAModal, 500);
        };

        // Escuchar cuando el usuario vuelve a la app
        if (!window._waFocusListenerAdded) {
            window.addEventListener('focus', () => {
                if (window._waActive) {
                    window._updateWAModal();
                }
            });
            window._waFocusListenerAdded = true;
        }

        window._updateWAModal();

    } catch (e) {
        console.error('[SYD] Error WhatsApp:', e);
        alert('Error: ' + e.message + '\n\nRevisa la conexión a internet.');
        btn.innerHTML = oldBtnText; btn.disabled = false;
    }
}

// RESTAURAR LA COLA DE WHATSAPP DESPUÉS DE LA SUSPENSIÓN / RECARGA DEL MÓVIL
function checkAndRestoreWhatsAppQueue() {
    if (localStorage.getItem('syd_wa_active') === 'true') {
        const queueRaw = localStorage.getItem('syd_wa_queue');
        const indexRaw = localStorage.getItem('syd_wa_index');
        
        if (queueRaw && indexRaw) {
            const queue = JSON.parse(queueRaw);
            const index = parseInt(indexRaw, 10);
            
            if (index < queue.length) {
                // Restaurar la cola global
                window._waQueue = queue;
                window._waIndex = index;
                window._waActive = true;
                
                const saludo = localStorage.getItem('syd_wa_saludo') || 'Buenas tardes';
                const obraName = localStorage.getItem('syd_wa_obraname') || 'Obra';
                const semana = localStorage.getItem('syd_wa_semana') || currentWeek;
                const fecha = localStorage.getItem('syd_wa_fecha') || '';
                const reportLink = localStorage.getItem('syd_wa_reportlink') || '';
                
                // Mostrar el modal de envío secuencial de nuevo
                const modalId = 'waSequentialModal';
                const oldModal = document.getElementById(modalId);
                if (oldModal) oldModal.remove();

                const modal = document.createElement('div');
                modal.id = modalId;
                modal.style.cssText = `
                    position:fixed; inset:0; z-index:100000;
                    background:rgba(0,0,0,0.9); display:flex; align-items:center; justify-content:center;
                    padding:20px; font-family:sans-serif; backdrop-filter:blur(10px);
                `;

                const card = document.createElement('div');
                card.id = 'waSequentialCard';
                card.style.cssText = `
                    background:#1e293b; border-radius:24px; width:100%; max-width:360px;
                    padding:32px 24px; color:#fff; text-align:center; box-shadow:0 25px 50px rgba(0,0,0,0.5);
                    border:1px solid rgba(255,255,255,0.1);
                `;
                
                modal.appendChild(card);
                document.body.appendChild(modal);

                window._updateWAModal = function() {
                    const idx = window._waIndex;
                    const total = window._waQueue.length;
                    
                    if (idx >= total) {
                        // Limpiar localStorage
                        localStorage.removeItem('syd_wa_queue');
                        localStorage.removeItem('syd_wa_index');
                        localStorage.removeItem('syd_wa_active');
                        localStorage.removeItem('syd_wa_saludo');
                        localStorage.removeItem('syd_wa_obraname');
                        localStorage.removeItem('syd_wa_semana');
                        localStorage.removeItem('syd_wa_fecha');
                        localStorage.removeItem('syd_wa_reportlink');
                        
                        card.innerHTML = `
                            <div style="font-size:3rem; margin-bottom:15px;">✅</div>
                            <div style="font-size:1.4rem; font-weight:800; margin-bottom:10px;">¡Todo enviado!</div>
                            <div style="font-size:0.9rem; color:#94a3b8; margin-bottom:24px;">Se han procesado los ${total} clientes de la lista.</div>
                            <button onclick="window._waActive=false; document.getElementById('${modalId}').remove()" style="width:100%; background:var(--accent); color:#fff; border:none; padding:15px; border-radius:14px; font-weight:700; font-size:1rem; cursor:pointer;">
                                Finalizar y Cerrar
                            </button>
                        `;
                        return;
                    }

                    const [phone, nombre] = window._waQueue[idx];
                    const pct = Math.round(((idx) / total) * 100);
                    
                    card.innerHTML = `
                        <div style="font-size:0.75rem; color:var(--accent2); font-weight:800; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:8px;">
                            Envío Secuencial (${idx + 1} de ${total})
                        </div>
                        <div style="height:6px; background:rgba(255,255,255,0.1); border-radius:3px; margin-bottom:24px; overflow:hidden;">
                            <div style="width:${pct}%; height:100%; background:var(--accent2); transition:width 0.3s;"></div>
                        </div>
                        
                        <div style="margin-bottom:24px;">
                            <div style="font-size:0.8rem; color:#94a3b8; margin-bottom:4px;">Enviar informe a:</div>
                            <div style="font-size:1.3rem; font-weight:800; color:#fff;">${nombre.toUpperCase()}</div>
                            <div style="font-size:0.9rem; color:var(--accent); font-weight:600; margin-top:4px;">${phone}</div>
                        </div>

                        <button onclick="window._sendCurrentWA()" style="width:100%; background:#25d366; color:#fff; border:none; padding:18px; border-radius:16px; font-weight:800; font-size:1.1rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; box-shadow:0 10px 20px rgba(37,211,102,0.2); margin-bottom:16px;">
                            <span>📱 ENVIAR AHORA</span>
                        </button>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                            <button onclick="window._waIndex++; localStorage.setItem('syd_wa_index', window._waIndex.toString()); window._updateWAModal()" style="background:rgba(255,255,255,0.05); color:#94a3b8; border:none; padding:10px; border-radius:10px; font-size:0.8rem; font-weight:600; cursor:pointer;">
                                Omitir este
                            </button>
                            <button onclick="window._waActive=false; localStorage.removeItem('syd_wa_queue'); localStorage.removeItem('syd_wa_index'); localStorage.removeItem('syd_wa_active'); localStorage.removeItem('syd_wa_saludo'); localStorage.removeItem('syd_wa_obraname'); localStorage.removeItem('syd_wa_semana'); localStorage.removeItem('syd_wa_fecha'); localStorage.removeItem('syd_wa_reportlink'); document.getElementById('${modalId}').remove()" style="background:transparent; color:#64748b; border:none; padding:10px; font-size:0.8rem; cursor:pointer;">
                                Cancelar todo
                            </button>
                        </div>
                    `;
                };

                window._sendCurrentWA = function() {
                    const [phone, nombre] = window._waQueue[window._waIndex];
                    const firstName = nombre.split(' ')[0].toUpperCase();
                    const emojiCalendar = '\uD83D\uDCC5';
                    const emojiDoc = '\uD83D\uDCC4';
                    const emojiEmail = '\uD83D\uDCE7';
                    const emojiPhone = '\uD83D\uDCDE';

                    const mensaje = `${saludo}, ${firstName}.

Le enviamos el informe semanal correspondiente a los trabajos realizados en su obra *${obraName}*.

${emojiCalendar} Semana ${semana} — ${fecha}
${reportLink ? `\n${emojiDoc} *Ver informe completo:*\n${reportLink}\n` : ''}
Cualquier duda o comentario estamos a sus órdenes.

_SYD Constructores_
${emojiEmail} info@sydconstructores.com.mx
${emojiPhone} 333 250 3313`;

                    let tel = phone.replace(/[^\d]/g, '');
                    if (tel.length === 10) tel = '52' + tel;

                    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`, '_blank');
                    
                    window._waIndex++;
                    localStorage.setItem('syd_wa_index', window._waIndex.toString());
                    setTimeout(window._updateWAModal, 500);
                };

                // Registrar focus listener si no está
                if (!window._waFocusListenerAdded) {
                    window.addEventListener('focus', () => {
                        if (window._waActive) {
                            window._updateWAModal();
                        }
                    });
                    window._waFocusListenerAdded = true;
                }

                window._updateWAModal();
            } else {
                // Limpiar si se completó de otra forma
                localStorage.removeItem('syd_wa_queue');
                localStorage.removeItem('syd_wa_index');
                localStorage.removeItem('syd_wa_active');
                localStorage.removeItem('syd_wa_saludo');
                localStorage.removeItem('syd_wa_obraname');
                localStorage.removeItem('syd_wa_semana');
                localStorage.removeItem('syd_wa_fecha');
                localStorage.removeItem('syd_wa_reportlink');
            }
        }
    }
}

// REENVIAR REPORTE EXISTENTE A TODOS LOS CLIENTES DE LA OBRA
window.reenviarReporte = async function(docId, semana, reportLink, btn) {
    if (!db) { alert('Firebase no está conectado.'); return; }
    const obraId = session.obra;
    if (!obraId) { alert('No hay obra seleccionada.'); return; }

    const oldBtnText = btn.innerHTML;
    btn.innerHTML = '...';
    btn.disabled = true;

    try {
        console.log('[SYD] Iniciando reenvío de reporte...');

        // 1. Buscar clientes
        const snap = await db.collection('clientes').get();
        const clientMap = {};
        
        snap.forEach(doc => {
            const d = doc.data();
            if (d.obra === obraId && d.telefono && d.nombre) {
                const phone = d.telefono.replace(/[^\d+]/g, '');
                if (phone) clientMap[phone] = d.nombre;
            }
        });

        const clients = Object.entries(clientMap);
        console.log('[SYD] Clientes para reenvío:', clients.length);

        if (clients.length === 0) {
            alert('⚠️ No se encontraron clientes registrados en esta obra.\n\nVe a la sección de "Registro de Accesos" para verificar.');
            btn.innerHTML = oldBtnText; btn.disabled = false;
            return;
        }

        const hour = new Date().getHours();
        const saludo = hour < 12 ? 'Buenos días' : 'Buenas tardes';
        const obraName = currentObra?.name || obraId;
        const fecha = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });

        btn.innerHTML = oldBtnText;
        btn.disabled = false;

        // Cerrar el modal del historial para que no se superponga
        const historyModal = document.getElementById('historyModal');
        if (historyModal) historyModal.remove();

        // 2. Iniciar flujo secuencial
        window._waQueue = clients;
        window._waIndex = 0;
        window._waActive = true;
        
        // Guardar en localStorage para resistir suspensiones
        localStorage.setItem('syd_wa_queue', JSON.stringify(clients));
        localStorage.setItem('syd_wa_index', '0');
        localStorage.setItem('syd_wa_active', 'true');
        localStorage.setItem('syd_wa_saludo', saludo);
        localStorage.setItem('syd_wa_obraname', obraName);
        localStorage.setItem('syd_wa_semana', semana.toString());
        localStorage.setItem('syd_wa_fecha', fecha);
        localStorage.setItem('syd_wa_reportlink', reportLink || '');
        
        const modalId = 'waSequentialModal';
        const oldModal = document.getElementById(modalId);
        if (oldModal) oldModal.remove();

        const modal = document.createElement('div');
        modal.id = modalId;
        modal.style.cssText = `
            position:fixed; inset:0; z-index:100000;
            background:rgba(0,0,0,0.9); display:flex; align-items:center; justify-content:center;
            padding:20px; font-family:sans-serif; backdrop-filter:blur(10px);
        `;

        const card = document.createElement('div');
        card.id = 'waSequentialCard';
        card.style.cssText = `
            background:#1e293b; border-radius:24px; width:100%; max-width:360px;
            padding:32px 24px; color:#fff; text-align:center; box-shadow:0 25px 50px rgba(0,0,0,0.5);
            border:1px solid rgba(255,255,255,0.1);
        `;
        
        modal.appendChild(card);
        document.body.appendChild(modal);

        window._updateWAModal = function() {
            const idx = window._waIndex;
            const total = window._waQueue.length;
            
            if (idx >= total) {
                localStorage.removeItem('syd_wa_queue');
                localStorage.removeItem('syd_wa_index');
                localStorage.removeItem('syd_wa_active');
                localStorage.removeItem('syd_wa_saludo');
                localStorage.removeItem('syd_wa_obraname');
                localStorage.removeItem('syd_wa_semana');
                localStorage.removeItem('syd_wa_fecha');
                localStorage.removeItem('syd_wa_reportlink');

                card.innerHTML = `
                    <div style="font-size:3rem; margin-bottom:15px;">✅</div>
                    <div style="font-size:1.4rem; font-weight:800; margin-bottom:10px;">¡Todo enviado!</div>
                    <div style="font-size:0.9rem; color:#94a3b8; margin-bottom:24px;">Se han procesado los ${total} clientes de la lista.</div>
                    <button onclick="window._waActive=false; document.getElementById('${modalId}').remove()" style="width:100%; background:var(--accent); color:#fff; border:none; padding:15px; border-radius:14px; font-weight:700; font-size:1rem; cursor:pointer;">
                        Finalizar y Cerrar
                    </button>
                `;
                return;
            }

            const [phone, nombre] = window._waQueue[idx];
            const pct = Math.round(((idx) / total) * 100);
            
            card.innerHTML = `
                <div style="font-size:0.75rem; color:var(--accent2); font-weight:800; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:8px;">
                    Reenvío Secuencial (${idx + 1} de ${total})
                </div>
                <div style="height:6px; background:rgba(255,255,255,0.1); border-radius:3px; margin-bottom:24px; overflow:hidden;">
                    <div style="width:${pct}%; height:100%; background:var(--accent2); transition:width 0.3s;"></div>
                </div>
                
                <div style="margin-bottom:24px;">
                    <div style="font-size:0.8rem; color:#94a3b8; margin-bottom:4px;">Enviar informe a:</div>
                    <div style="font-size:1.3rem; font-weight:800; color:#fff;">${nombre.toUpperCase()}</div>
                    <div style="font-size:0.9rem; color:var(--accent); font-weight:600; margin-top:4px;">${phone}</div>
                </div>

                <button onclick="window._sendCurrentWA()" style="width:100%; background:#25d366; color:#fff; border:none; padding:18px; border-radius:16px; font-weight:800; font-size:1.1rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; box-shadow:0 10px 20px rgba(37,211,102,0.2); margin-bottom:16px;">
                    <span>📱 ENVIAR AHORA</span>
                </button>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <button onclick="window._waIndex++; localStorage.setItem('syd_wa_index', window._waIndex.toString()); window._updateWAModal()" style="background:rgba(255,255,255,0.05); color:#94a3b8; border:none; padding:10px; border-radius:10px; font-size:0.8rem; font-weight:600; cursor:pointer;">
                        Omitir este
                    </button>
                    <button onclick="window._waActive=false; localStorage.removeItem('syd_wa_queue'); localStorage.removeItem('syd_wa_index'); localStorage.removeItem('syd_wa_active'); localStorage.removeItem('syd_wa_saludo'); localStorage.removeItem('syd_wa_obraname'); localStorage.removeItem('syd_wa_semana'); localStorage.removeItem('syd_wa_fecha'); localStorage.removeItem('syd_wa_reportlink'); document.getElementById('${modalId}').remove()" style="background:transparent; color:#64748b; border:none; padding:10px; font-size:0.8rem; cursor:pointer;">
                        Cancelar todo
                    </button>
                </div>
            `;
        };

        window._sendCurrentWA = function() {
            const [phone, nombre] = window._waQueue[window._waIndex];
            const firstName = nombre.split(' ')[0].toUpperCase();
            const emojiCalendar = '\uD83D\uDCC5';
            const emojiDoc = '\uD83D\uDCC4';
            const emojiEmail = '\uD83D\uDCE7';
            const emojiPhone = '\uD83D\uDCDE';

            const mensaje = `${saludo}, ${firstName}.

Le enviamos el informe semanal correspondiente a los trabajos realizados en su obra *${obraName}*.

${emojiCalendar} Semana ${semana} — ${fecha}
${reportLink ? `\n${emojiDoc} *Ver informe completo:*\n${reportLink}\n` : ''}
Cualquier duda o comentario estamos a sus órdenes.

_SYD Constructores_
${emojiEmail} info@sydconstructores.com.mx
${emojiPhone} 333 250 3313`;

            let tel = phone.replace(/[^\d]/g, '');
            if (tel.length === 10) tel = '52' + tel;

            window.open(`https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`, '_blank');
            
            window._waIndex++;
            localStorage.setItem('syd_wa_index', window._waIndex.toString());
            setTimeout(window._updateWAModal, 500);
        };

        if (!window._waFocusListenerAdded) {
            window.addEventListener('focus', () => {
                if (window._waActive) {
                    window._updateWAModal();
                }
            });
            window._waFocusListenerAdded = true;
        }

        window._updateWAModal();

    } catch (e) {
        console.error('[SYD] Error reenvío WhatsApp:', e);
        alert('Error al reenviar: ' + e.message);
        btn.innerHTML = oldBtnText; btn.disabled = false;
    }
};




// Carga imagen como Base64 — con proxy CORS cuando es necesario
function getBase64ImageSafe(url) {
    return new Promise((resolve) => {
        // Si es una URL de assets local, cargar directamente
        const isLocal = !url.startsWith('http');
        const img = new Image();
        if (!isLocal) img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
                resolve(dataUrl.split(',')[1]); // Solo la parte Base64
            } catch(canvasErr) {
                console.warn('[SYD] Canvas error para', url, canvasErr.message);
                resolve(null);
            }
        };
        img.onerror = () => {
            console.warn('[SYD] No se pudo cargar imagen:', url);
            resolve(null);
        };
        img.src = url;
    });
}

// IMGBB — FOTOS (Punto 4, sin tarjeta)
// ══════════════════════════════════════
const IMGBB_API_KEY = 'ef497f7df24480c5df8656ba07fea071';

let _uploadContext = null;

function triggerFotoUpload(zIdx) {
    if(session.role !== 'master') return;
    const zona = projectData[zIdx];
    _uploadContext = {
        zIdx,
        semana: currentWeek,
        tarea:  zona.tasks[currentWeek-1] || 'Tarea sem ' + currentWeek,
        zona:   zona.zone
    };
    document.getElementById('fotoInput').click();
}

async function handleFotoSelected(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if(!file || !_uploadContext) return;

    const ctx = _uploadContext;
    const progEl = document.getElementById('up-prog-' + ctx.zIdx);
    if(progEl) { progEl.style.display='block'; progEl.textContent='⏳ Procesando imagen...'; }

    try {
        // Compresión optimizada para PDF (800px, 0.6 quality)
        const base64 = await imageToBase64(file, 800, 0.6);
        if(progEl) progEl.textContent = '⏳ Subiendo a ImgBB...';

        const formData = new FormData();
        formData.append('key', IMGBB_API_KEY);
        formData.append('image', base64);
        formData.append('name', `SYD_z${ctx.zIdx}_s${ctx.semana}_${Date.now()}`);

        const resp = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST', body: formData
        });
        const result = await resp.json();

        if(!result.success) throw new Error(result.error?.message || 'Error ImgBB');

        const url = result.data.display_url;
        const thumb = result.data.thumb?.url || url;

        if(db) {
            await db.collection('obras').doc(session.obra || 'SAUCES')
                .collection('fotos').add({
                    zona:      ctx.zona,
                    zona_idx:  ctx.zIdx,
                    semana:    ctx.semana,
                    tarea:     ctx.tarea,
                    url,
                    thumb,
                    type:      'image',
                    subidoPor: session.email,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    fecha:     new Date().toLocaleDateString('es-MX'),
                    hora:      new Date().toLocaleTimeString('es-MX')
                });
        }
        if(progEl) { progEl.textContent='✅ Foto subida'; setTimeout(()=>{ progEl.style.display='none'; },2500); }
        loadFotosGallery(ctx.zIdx, ctx.semana, 'gallery-' + ctx.zIdx);
        loadFotosGallery(ctx.zIdx, ctx.semana, 'dgallery-' + ctx.zIdx);

    } catch(err) {
        if(progEl) { progEl.textContent='❌ Error: ' + err.message; }
        console.error('ImgBB upload error:', err);
    }
}

let _fotoListeners = {};

// — Cargar galería de fotos de una zona/semana (Tiempo Real)
function loadFotosGallery(zIdx, semana, containerId, filterByWeek = false) {
    const el = document.getElementById(containerId);
    if(!el) return;
    if(!db) { el.innerHTML = ''; return; }
    try {
        if(_fotoListeners[containerId]) {
            _fotoListeners[containerId](); // Cancelar escucha previa
        }

        _fotoListeners[containerId] = db.collection('obras').doc(session.obra || 'SAUCES')
            .collection('fotos')
            .where('zona_idx','==', zIdx)
            .onSnapshot((snap) => {
                if(snap.empty) { el.innerHTML = ''; return; }
                
                let docs = [];
                snap.forEach(doc => {
                    const d = doc.data();
                    if(!filterByWeek || parseInt(d.semana) === parseInt(semana)) {
                        docs.push({ id: doc.id, data: d });
                    }
                });
                
                if(docs.length === 0) { el.innerHTML = ''; return; }
                
                docs.sort((a,b) => {
                    const tA = a.data.timestamp && typeof a.data.timestamp.toMillis === 'function' ? a.data.timestamp.toMillis() : 0;
                    const tB = b.data.timestamp && typeof b.data.timestamp.toMillis === 'function' ? b.data.timestamp.toMillis() : 0;
                    return tB - tA;
                });
                
                docs = docs.slice(0, 10);
                
                let html = `<div class="foto-count-badge">📷 ${docs.length} foto(s) recientes de la zona</div>
                            <div class="foto-gallery">`;
                docs.forEach(docData => {
                    const d = docData.data;
                    const thumbSrc = d.thumb || d.url;
                    const caption = `${d.zona} · Sem ${d.semana} · ${d.tarea||''}`;
                    
                    html += `
                        <div style="position:relative; display:inline-block; margin-right:8px; margin-bottom:8px;">
                            <img class="foto-thumb" src="${thumbSrc}"
                                  onclick="openLightbox('${d.url}','${caption}')"
                                  alt="Foto de avance">
                            ${session.role === 'master' ? `
                                <div onclick="deleteFoto('${docData.id}', event)" 
                                     style="position:absolute; top:-5px; right:-5px; background:#ef4444; color:#fff; 
                                            width:22px; height:22px; border-radius:50%; display:flex; align-items:center; 
                                            justify-content:center; font-size:0.7rem; cursor:pointer; border:2px solid var(--surface);
                                            box-shadow:0 2px 8px rgba(0,0,0,0.4); z-index:10;">
                                    🗑️
                                </div>
                            ` : ''}
                        </div>`;
                });
                html += '</div>';
                el.innerHTML = html;
            }, (error) => {
                console.warn('loadFotosGallery onSnapshot:', error.message);
                el.innerHTML = '';
            });
    } catch(e) {
        console.warn('loadFotosGallery init:', e.message);
        el.innerHTML = '';
    }
}
async function deleteFoto(docId, event) {
    if (event) event.stopPropagation();
    if (!confirm('¿Eliminar esta foto permanentemente?')) return;
    try {
        await db.collection('obras').doc(session.obra || 'SAUCES')
            .collection('fotos').doc(docId).delete();
        console.log('[SYD] Foto eliminada:', docId);
    } catch(e) {
        alert('Error al eliminar foto: ' + e.message);
    }
}

// — Lightbox
function openLightbox(url, caption) {
    document.getElementById('lightboxImg').src = url;
    document.getElementById('lightboxCaption').textContent = caption;
    document.getElementById('lightbox').classList.add('show');
}
function closeLightbox() {
    document.getElementById('lightbox').classList.remove('show');
    document.getElementById('lightboxImg').src = '';
}

// — Convertir imagen a base64 comprimida
function imageToBase64(file, maxWidth, quality) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = ev => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if(w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                // Return base64 without the data:image/...;base64, prefix
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl.split(',')[1]);
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });
}



// UI: Password Toggle
window.togglePasswordVisibility = function(inputId, btn) {
    const input = document.getElementById(inputId);
    if(input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-eye-off"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
    } else {
        input.type = 'password';
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-eye"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
    }
};









// Cargar Historial de Reportes
window.cargarHistorialReportes = async function() {
    const listWrap = document.getElementById('historialReportesList');
    if(!listWrap) return;
    if(!session || !session.obra) return;
    
    listWrap.innerHTML = '<div style="text-align:center; padding:20px; color:var(--muted); font-size:0.85rem;">Cargando reportes...</div>';
    
    try {
        const snap = await db.collection('informes_compartidos')
            .where('obra', '==', session.obra)
            .get();
            
        if(snap.empty) {
            listWrap.innerHTML = '<div style="text-align:center; padding:20px; color:var(--muted); font-size:0.85rem;">No hay reportes publicados aún.</div>';
            return;
        }
        
        let docs = [];
        snap.forEach(doc => docs.push(doc));
        docs.sort((a, b) => {
            const timeA = a.data().creado ? a.data().creado.toDate().getTime() : 0;
            const timeB = b.data().creado ? b.data().creado.toDate().getTime() : 0;
            return timeB - timeA;
        });
        
        let html = '';
        docs.forEach(doc => {
            const data = doc.data();
            const dateStr = data.creado ? data.creado.toDate().toLocaleDateString('es-MX', {day:'2-digit', month:'short', year:'numeric'}) : 'Reciente';
            
            html += `<div class="zone-card" onclick="verReporteOficial('${doc.id}')" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-weight:700; color:var(--accent);">Reporte Semana ${data.semana}</div>
                    <div style="font-size:0.7rem; color:var(--muted); margin-top:4px;">Publicado: ${dateStr}</div>
                </div>
                <div style="color:var(--accent2);">📑 Ver</div>
            </div>`;
        });
        
        listWrap.innerHTML = html;
        window._informesSnapshot = snap;
    } catch(e) {
        console.error('Error cargando reportes:', e);
        listWrap.innerHTML = '<div style="text-align:center; padding:20px; color:#dc2626; font-size:0.85rem;">Error al cargar reportes.</div>';
    }
};

window.verReporteOficial = function(docId) {
    if(!window._informesSnapshot) return;
    const doc = window._informesSnapshot.docs.find(d => d.id === docId);
    if(!doc) return;
    
    const htmlContent = doc.data().html;
    
    const modal = document.createElement('div');
    modal.id = 'reportModalReadOnly';
    modal.style.cssText = 'position:fixed; inset:0; z-index:99999; background:#fff; overflow-y:auto; font-family:Arial,Helvetica,sans-serif;';
    
    const bar = document.createElement('div');
    bar.style.cssText = 'position:sticky; top:0; z-index:10; background:#ffffff; padding:12px 15px; display:flex; align-items:center; justify-content:space-between; box-shadow:0 4px 15px rgba(0,0,0,0.08); border-bottom:1px solid #e2e8f0;';
    
    bar.innerHTML = `<div style="display:flex; align-items:center; gap:10px;">
        <button onclick="document.getElementById('reportModalReadOnly').remove()"
            style="background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;
            padding:8px 14px;border-radius:24px;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;">
            ◀ Regresar
        </button>
    </div>
    <div>
        <button onclick="window.print()"
            style="background:#fff;color:#2563eb;border:1px solid #bfdbfe;
            padding:8px 14px;border-radius:24px;font-weight:600;font-size:14px;cursor:pointer;display:flex;align-items:center;box-shadow:0 2px 4px rgba(37,99,235,0.05);">
            🖨️ Descargar PDF
        </button>
    </div>`;
    
    const content = document.createElement('div');
    content.style.cssText = 'padding:0; background:#fff; min-height:100vh;';
    content.innerHTML = htmlContent;
    
    modal.appendChild(bar);
    modal.appendChild(content);
    document.body.appendChild(modal);
};

