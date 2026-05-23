
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
const APP_VERSION = 'v2.4.3';
let newWorker;

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(reg => {
            console.log('[SYD] Service Worker Registrado');

            const lastVersion = localStorage.getItem('syd_sw_version');

            reg.addEventListener('updatefound', () => {
                newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // Solo mostrar banner si es una versión NUEVA real
                        if (lastVersion === APP_VERSION) {
                            // Misma versión: ignorar completamente, NO hacer SKIP_WAITING
                            console.log('[SYD] SW reinstalado pero misma versión, ignorando');
                            return;
                        }
                        document.getElementById('updateBanner').classList.add('show');
                    }
                });
            });

            if (!reg.waiting) {
                localStorage.setItem('syd_sw_version', APP_VERSION);
            }
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
