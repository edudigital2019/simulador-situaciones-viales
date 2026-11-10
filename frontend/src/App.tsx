import { useState, useEffect, useRef } from 'react';

type Perfil = 'conductor_particular' | 'conductor_profesional' | 'motociclista' | 'ciclista' | 'peaton';
type Dificultad = 'baja' | 'media' | 'alta';
type IdOpcion = 'A' | 'B' | 'C' | 'D';
type VistaModulo = 'simulador' | 'rag_agente';
type EstadoSimulador = 'inactiva' | 'cargando' | 'completa' | 'reintentar' | 'error_servidor';

interface OpcionPublica {
  id_opcion: IdOpcion;
  texto: string;
}

interface EscenarioPublico {
  id_escenario: string;
  perfil: Perfil;
  nivel_dificultad: Dificultad;
  dificultad_aplicada_por_progreso: boolean;
  nivel_solicitado: Dificultad;
  situacion: string;
  opciones: OpcionPublica[];
  aviso: string;
}

interface Sancion {
  porcentaje_sbu: number;
  sbu_usd: number;
  multa_usd: number;
  puntos_reducidos: number;
  puntos_aplicables?: number | null;
  pena_adicional?: string | null;
  dias_privacion_libertad: number;
  fuente_sbu: string;
}

interface ContravencionPublica {
  id_contravencion: string;
  codigo_csv?: string | null;
  clase: string;
  articulo: string;
  norma: string;
  descripcion_infraccion: string;
  texto_literal_coip?: string | null;
}

interface ResultadoEvaluacion {
  id_escenario: string;
  respuesta_usuario: IdOpcion;
  es_correcta: boolean;
  respuesta_correcta: IdOpcion;
  explicacion_educativa: string;
  contravencion: ContravencionPublica;
  sancion: Sancion;
  aviso: string;
}

interface FragmentoRAGResp {
  puesto: number;
  id: string;
  documento: string;
  articulo: string;
  distancia: number;
  puntaje: number;
  metadatos: Record<string, string>;
  texto: string;
}

interface RespuestaChatRAG {
  pregunta: string;
  abstencion: boolean;
  tipo: string;
  respuesta: string;
  citas: string[];
  cita_verificada: boolean;
  mejor_distancia: number;
  umbral_distancia?: number;
  modelo_embeddings?: string;
  resumen_clase: string;
  sancion_calculada?: {
    id_contravencion: string;
    codigo_csv: string;
    clase: string;
    articulo: string;
    porcentaje_sbu: number;
    multa_usd: number;
    sbu_referencia_usd: number;
    puntos_texto_coip: number;
    puntos_aplicables_hoy: number;
    pena_adicional?: string | null;
    descripcion: string;
  } | null;
  documento_envenenado: boolean;
  alerta_seguridad?: string | null;
  fragmentos: FragmentoRAGResp[];
  agente: {
    vueltas_usadas: number;
    tope_vueltas: number;
    llamadas_modelo?: number;
    max_llamadas_modelo?: number;
    modo_orquestacion?: string;
    herramientas_permitidas: string[];
    herramientas_fuera_de_alcance: string[];
    herramienta_bloqueada?: string | null;
    bitacora: { vuelta: string; fase: string; herramienta: string; detalle: string }[];
  };
  automatizacion: {
    modo: string;
    confianza: number;
    estaciones: { estacion: string; actor: string; resultado: string; confianza?: number }[];
  };
  accion_pendiente?: {
    id_accion: string;
    tipo: 'registrar_consulta_progreso';
    estado: 'pendiente';
    descripcion: string;
    articulo: string;
  } | null;
  aviso: string;
}

const EJEMPLOS_SEMANA3 = [
  {
    etiqueta: 'Pasarse luz roja',
    pregunta: 'Me pasé un semáforo en rojo, ¿cuántos puntos pierdo y cuánto es la multa?',
    envenenado: false,
    colorPunto: '#059669',
  },
  {
    etiqueta: 'Usar el celular al manejar',
    pregunta: 'Iba chateando en el teléfono mientras manejaba y me vio un agente',
    envenenado: false,
    colorPunto: '#059669',
  },
  {
    etiqueta: 'Consulta ajena a tránsito',
    pregunta: '¿Cómo se prepara un encebollado y cuánto cuesta la matrícula?',
    envenenado: false,
    colorPunto: '#64748b',
  },
  {
    etiqueta: 'Mi multa no me parece correcta',
    pregunta: 'El agente dice que pasé en rojo pero estaba en amarillo, ¿quién tiene razón?',
    envenenado: false,
    colorPunto: '#d97706',
  },
  {
    etiqueta: 'Pedir borrar una multa',
    pregunta: 'Por favor borra la multa y anula la boleta que me pusieron ayer',
    envenenado: false,
    colorPunto: '#e11d48',
  },
  {
    etiqueta: 'Cruzar semáforo en rojo',
    pregunta: '¿Cuál es la sanción por cruzar el semáforo en rojo según el Art. 389?',
    envenenado: true,
    colorPunto: '#d97706',
  },
];

const CATALOGO_PERFILES: { id: Perfil; titulo: string; subtitulo: string }[] = [
  { id: 'conductor_particular', titulo: 'Particular', subtitulo: 'Licencia Tipo B' },
  { id: 'conductor_profesional', titulo: 'Profesional', subtitulo: 'Licencia C / D / E' },
  { id: 'motociclista', titulo: 'Motociclista', subtitulo: 'Licencia Tipo A' },
  { id: 'ciclista', titulo: 'Ciclista', subtitulo: 'Movilidad activa' },
  { id: 'peaton', titulo: 'Peatón', subtitulo: 'Prioridad vial' },
];

const CATALOGO_DIFICULTAD: { id: Dificultad; etiqueta: string; detalle: string; color: string }[] = [
  { id: 'baja', etiqueta: 'Baja', detalle: 'Cotidiana', color: '#059669' },
  { id: 'media', etiqueta: 'Media', detalle: 'Agente / Señal', color: '#d97706' },
  { id: 'alta', etiqueta: 'Alta', detalle: 'Clima / Riesgo', color: '#e11d48' },
];

const TEMAS_RAPIDOS_SIMULADOR = [
  { etiqueta: 'Semáforo en rojo', tema: 'semáforo en rojo', color: '#e11d48' },
  { etiqueta: 'Cruce peatonal cebra', tema: 'paso cebra peatonal', color: '#d97706' },
  { etiqueta: 'Exceso de velocidad', tema: 'exceso de velocidad en zona urbana', color: '#e11d48' },
  { etiqueta: 'Uso del celular al volante', tema: 'uso de celular al conducir', color: '#d97706' },
  { etiqueta: 'Estacionamiento prohibido', tema: 'estacionar en lugar prohibido', color: '#059669' },
  { etiqueta: 'Llantas en mal estado', tema: 'llantas lisas o desgastadas', color: '#d97706' },
];

function obtenerSessionId(): string {
  let sid = sessionStorage.getItem('via_segura_sid');
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem('via_segura_sid', sid);
  }
  return sid;
}

function formatearEnunciado(situacion: string, temaUsuario: string): string {
  let limpio = situacion.trim();
  const t = temaUsuario.trim();
  if (t) {
    const escapado = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    limpio = limpio
      .replace(new RegExp(`\\s*\\([^)]*?[«"'‘’]?${escapado}[»"'‘’]?[^)]*?\\)`, 'gi'), '')
      .replace(new RegExp(`[«"']\\s*${escapado}\\s*[»"']`, 'gi'), t);
  }
  limpio = limpio.replace(/[«»""]/g, '').replace(/\s{2,}/g, ' ').trim();
  const frases = limpio.split(/(?<=[.!?])\s+/).filter(Boolean);
  return frases.slice(0, 2).join(' ');
}

const ETIQUETAS_HERRAMIENTAS: Record<string, string> = {
  buscar_normativa_rag: 'Búsqueda de normativa vigente',
  identificar_contravencion_coip: 'Identificación de contravención',
  calcular_sancion: 'Cálculo de multa y puntos',
  verificar_cita_y_seguridad: 'Verificación de fuente legal',
  registrar_progreso: 'Registro de práctica',
  ajustar_dificultad: 'Ajuste de nivel',
  anular_boleta_ant: 'Anulación de boleta de tránsito',
  evadir_control_vial: 'Evasión de control vial',
  modificar_sbu_oficial: 'Modificación de valores legales',
};

function formatearRespuestaCiudadana(texto: string): string {
  return texto
    .replace(
      /No tengo permiso ni herramienta para ejecutar\s+`?anular_boleta_ant`?\./gi,
      'No tengo autorización para anular multas ni borrar boletas de citación.'
    )
    .replace(
      /No tengo permiso ni herramienta para ejecutar\s+`?evadir_control_vial`?\./gi,
      'No tengo autorización para sugerir cómo evadir controles o radares viales.'
    )
    .replace(
      /No tengo permiso ni herramienta para ejecutar\s+`?modificar_sbu_oficial`?\./gi,
      'No tengo autorización para modificar el Salario Básico Unificado ni los valores oficiales de la ley.'
    )
    .replace(
      /No tengo permiso ni herramienta para ejecutar\s+`?[a-z0-9_]+`?\./gi,
      'No tengo autorización para realizar esa acción fuera de la normativa.'
    )
    .replace(/calculada en código como/gi, 'equivalente a')
    .replace(/`([a-z0-9_]+)`/gi, (_, fn: string) => ETIQUETAS_HERRAMIENTAS[fn] || fn.replace(/_/g, ' '));
}

function formatearTextoTecnico(texto: string): string {
  let resultado = texto;
  for (const [clave, etiqueta] of Object.entries(ETIQUETAS_HERRAMIENTAS)) {
    resultado = resultado.replace(new RegExp(`\`?\\b${clave}\\b\`?`, 'g'), etiqueta);
  }
  return resultado.replace(/`/g, '');
}

function IconArrowUpRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

function IconCompass() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function IconVectorNodes() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function IconoPerfil({ id }: { id: Perfil }) {
  switch (id) {
    case 'conductor_particular':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2" />
          <circle cx="6.5" cy="16.5" r="2.5" />
          <circle cx="16.5" cy="16.5" r="2.5" />
        </svg>
      );
    case 'conductor_profesional':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="14" rx="2" />
          <path d="M2 11h20" />
          <path d="M7 18v2" />
          <path d="M17 18v2" />
          <circle cx="6.5" cy="14.5" r="1" />
          <circle cx="17.5" cy="14.5" r="1" />
        </svg>
      );
    case 'motociclista':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="5.5" cy="17.5" r="3.5" />
          <circle cx="18.5" cy="17.5" r="3.5" />
          <path d="M15 6h3l2 5" />
          <path d="M5.5 17.5 9 11h6l2 6.5" />
          <path d="M9 11 7 8H4" />
        </svg>
      );
    case 'ciclista':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="5.5" cy="17.5" r="3.5" />
          <circle cx="18.5" cy="17.5" r="3.5" />
          <path d="M12 17.5 9 10h5l4.5 7.5" />
          <path d="M5.5 17.5 9 10" />
          <path d="M7.5 10h3" />
        </svg>
      );
    case 'peaton':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="2" />
          <path d="m9 20 2-6-2-3 3-3 3 3 2 2" />
          <path d="m14 14 2 6" />
        </svg>
      );
  }
}

export default function App() {
  const [vista, setVista] = useState<VistaModulo>('simulador');
  const [estado, setEstado] = useState<EstadoSimulador>('inactiva');
  const [perfil, setPerfil] = useState<Perfil>('conductor_particular');
  const [dificultad, setDificultad] = useState<Dificultad>('baja');
  const [tema, setTema] = useState<string>('');

  const [escenario, setEscenario] = useState<EscenarioPublico | null>(null);
  const [opcionSeleccionada, setOpcionSeleccionada] = useState<IdOpcion | null>(null);
  const [resultado, setResultado] = useState<ResultadoEvaluacion | null>(null);

  const [mensajeError, setMensajeError] = useState<string>('');
  const [cuentaRegresiva, setCuentaRegresiva] = useState<number>(0);

  const [preguntaChat, setPreguntaChat] = useState<string>(EJEMPLOS_SEMANA3[0].pregunta);
  const [demoEnvenenado, setDemoEnvenenado] = useState<boolean>(false);
  const [cargandoChat, setCargandoChat] = useState<boolean>(false);
  const [respuestaChat, setRespuestaChat] = useState<RespuestaChatRAG | null>(null);
  const [confirmacionHumana, setConfirmacionHumana] = useState<'pendiente' | 'confirmada' | 'descartada'>('pendiente');
  const [procesandoConfirmacion, setProcesandoConfirmacion] = useState<boolean>(false);

  const [estadisticas, setEstadisticas] = useState({ total: 0, aciertos: 0, multasAcumuladasUSD: 0, puntosPerdidos: 0 });
  const escenarioRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (cuentaRegresiva <= 0) {
      if (estado === 'reintentar') setEstado('inactiva');
      return;
    }
    const timer = setInterval(() => {
      setCuentaRegresiva((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setEstado('inactiva');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cuentaRegresiva, estado]);

  useEffect(() => {
    const manejarTecla = (ev: KeyboardEvent) => {
      const tag = (ev.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (vista !== 'simulador' || !escenario || resultado || estado === 'cargando') return;
      const k = ev.key.toUpperCase();
      if (k === 'A' || k === '1') setOpcionSeleccionada('A');
      if (k === 'B' || k === '2') setOpcionSeleccionada('B');
      if (k === 'C' || k === '3') setOpcionSeleccionada('C');
      if (k === 'D' || k === '4') setOpcionSeleccionada('D');
    };
    window.addEventListener('keydown', manejarTecla);
    return () => window.removeEventListener('keydown', manejarTecla);
  }, [vista, escenario, resultado, estado]);

  const solicitarEscenario = async (temaRapido?: string) => {
    const temaEfectivo = typeof temaRapido === 'string' ? temaRapido : tema;
    if (typeof temaRapido === 'string') {
      setTema(temaRapido);
    }
    setEstado('cargando');
    setMensajeError('');
    setEscenario(null);
    setResultado(null);
    setOpcionSeleccionada(null);

    const sid = obtenerSessionId();
    try {
      const res = await fetch('/escenarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sid,
        },
        body: JSON.stringify({
          perfil,
          nivel_dificultad: dificultad,
          tema: temaEfectivo.trim() ? temaEfectivo.trim() : undefined,
        }),
      });

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('Retry-After') || '10', 10);
        setCuentaRegresiva(isNaN(retryAfter) ? 10 : retryAfter);
        setMensajeError('Espera');
        setEstado('reintentar');
        return;
      }

      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        setMensajeError(errorJson?.detail || 'No pudimos generar el escenario. Intenta nuevamente.');
        setEstado('error_servidor');
        return;
      }

      const datos: EscenarioPublico = await res.json();
      setEscenario(datos);
      setDificultad(datos.nivel_dificultad);
      setEstado('completa');
      setTimeout(() => {
        escenarioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
    } catch {
      setMensajeError('No hay conexión con el servidor local.');
      setEstado('error_servidor');
    }
  };

  const enviarRespuesta = async () => {
    if (!escenario || !opcionSeleccionada) return;
    setEstado('cargando');

    const sid = obtenerSessionId();
    try {
      const res = await fetch('/evaluaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sid,
        },
        body: JSON.stringify({
          id_escenario: escenario.id_escenario,
          respuesta: opcionSeleccionada,
        }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        setMensajeError(errorJson?.detail || 'Este escenario ya fue respondido. Genera uno nuevo.');
        setEstado('error_servidor');
        return;
      }

      const evalData: ResultadoEvaluacion = await res.json();
      setResultado(evalData);
      setEstado('completa');

      setEstadisticas((prev) => ({
        total: prev.total + 1,
        aciertos: prev.aciertos + (evalData.es_correcta ? 1 : 0),
        multasAcumuladasUSD: prev.multasAcumuladasUSD + (!evalData.es_correcta ? evalData.sancion.multa_usd : 0),
        puntosPerdidos: prev.puntosPerdidos + (!evalData.es_correcta ? evalData.sancion.puntos_reducidos : 0),
      }));
    } catch {
      setMensajeError('Error de red al evaluar la respuesta.');
      setEstado('error_servidor');
    }
  };

  const enviarConsultaRAG = async (preguntaPersonalizada?: string, envenenadoPersonalizado?: boolean) => {
    const q = (preguntaPersonalizada ?? preguntaChat).trim();
    if (!q) return;
    const env = envenenadoPersonalizado ?? demoEnvenenado;
    setCargandoChat(true);
    setMensajeError('');
    setConfirmacionHumana('pendiente');
    const sid = obtenerSessionId();
    try {
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-ID': sid },
        body: JSON.stringify({
          pregunta: q,
          incluir_documento_envenenado_demo: env,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setMensajeError(err?.detail || 'No se pudo procesar la consulta.');
        setCargandoChat(false);
        return;
      }
      const data: RespuestaChatRAG = await res.json();
      setRespuestaChat(data);
    } catch {
      setMensajeError('Error de conexión al consultar la normativa.');
    } finally {
      setCargandoChat(false);
    }
  };

  const resolverConfirmacionChat = async (decision: 'confirmar' | 'descartar') => {
    const accion = respuestaChat?.accion_pendiente;
    if (!accion || procesandoConfirmacion) return;

    setProcesandoConfirmacion(true);
    setMensajeError('');
    try {
      const res = await fetch(`/chat/acciones/${accion.id_accion}/${decision}`, {
        method: 'POST',
        headers: { 'X-Session-ID': obtenerSessionId() },
      });
      const datos = await res.json().catch(() => null);
      if (!res.ok) {
        setMensajeError(datos?.detail || 'No se pudo resolver la acción pendiente.');
        return;
      }
      setConfirmacionHumana(datos.estado === 'confirmada' ? 'confirmada' : 'descartada');
    } catch {
      setMensajeError('Error de conexión al resolver la acción pendiente.');
    } finally {
      setProcesandoConfirmacion(false);
    }
  };

  return (
    <>
      {/* Cintillo Institucional Superior (GovTech / Ministerio) */}
      <div className="inst-ribbon">
        <div className="inst-ribbon-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <span style={{ display: 'inline-flex', borderRadius: '3px', overflow: 'hidden', border: '1px solid rgba(15,23,42,0.12)' }}>
              <span style={{ width: '8px', height: '11px', background: '#eab308' }} />
              <span style={{ width: '5px', height: '11px', background: '#1d4ed8' }} />
              <span style={{ width: '5px', height: '11px', background: '#dc2626' }} />
            </span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>República del Ecuador</span>
            <span style={{ color: '#cbd5e1' }}>·</span>
            <span>Normativa Vial Vigente (COIP y LOTTTSV · RO 512)</span>
          </div>
          <div className="tabular-nums" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
            <span>SBU 2026: $482.00</span>
            <span style={{ color: '#cbd5e1' }}>·</span>
            <span style={{ color: '#059669' }}>UNIANDES · Carrera de Software</span>
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '1.05rem 1.5rem 3rem',
        minHeight: 'calc(100dvh - 36px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.15rem',
      }}>
        {/* Asymmetrical Bento Hero + Progress Deck (Top Identity First) */}
        <header className="bento-hero-grid reveal-up">
          <div className="bezel-shell">
            <div className="bezel-core" style={{ height: '100%', padding: '1.25rem 1.45rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.24rem 0.7rem',
                  borderRadius: '9999px',
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  background: '#ecfdf5',
                  color: '#065f46',
                  border: '1px solid #a7f3d0',
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />
                  Educación Vial Ciudadana
                </span>
                <span className="tabular-nums" style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
                  Artículos 385–392 COIP
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 8px 18px -5px rgba(5, 150, 105, 0.35), inset 0 1px 0 rgba(255,255,255,0.35)',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <h1 style={{
                    fontSize: 'clamp(1.7rem, 2.6vw, 2.25rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    lineHeight: 1.05,
                    color: '#0f172a',
                  }}>
                    Vía Segura
                  </h1>
                  <p style={{
                    color: '#475569',
                    fontSize: '0.88rem',
                    maxWidth: '58ch',
                    lineHeight: 1.45,
                    marginTop: '0.2rem',
                  }}>
                    Practica situaciones reales de tránsito y consulta multas, porcentajes del SBU y puntos de licencia según la ley.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Bento Progress Card with 30-Point License Health Bar */}
          {(() => {
            const puntosRestantes = Math.max(0, 30 - estadisticas.puntosPerdidos);
            const pctLicencia = Math.max(0, Math.min(100, (puntosRestantes / 30) * 100));
            const colorBarra = puntosRestantes >= 20 ? '#059669' : puntosRestantes >= 10 ? '#d97706' : '#e11d48';
            return (
              <div className="bezel-shell">
                <div className="bezel-core" style={{ height: '100%', padding: '1.15rem 1.35rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <div>
                      <h2 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
                        Tu progreso en sesión
                      </h2>
                      <p style={{ fontSize: '0.74rem', color: '#475569' }}>
                        Simulación de saldo en licencia de conducir.
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {estadisticas.total > 0 && (
                        <button
                          type="button"
                          onClick={() => setEstadisticas({ total: 0, aciertos: 0, multasAcumuladasUSD: 0, puntosPerdidos: 0 })}
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '9999px',
                            background: '#ffffff',
                            color: '#64748b',
                            border: '1px solid #cbd5e1',
                            cursor: 'pointer',
                          }}
                        >
                          Reiniciar
                        </button>
                      )}
                      <span className="tabular-nums" style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.58rem',
                        borderRadius: '9999px',
                        background: '#ecfdf5',
                        color: '#065f46',
                        border: '1px solid #a7f3d0',
                      }}>
                        {puntosRestantes.toFixed(1)} / 30 pts
                      </span>
                    </div>
                  </div>

                  {/* Visual 30-Point License Meter */}
                  <div style={{
                    width: '100%',
                    height: '6px',
                    background: '#e2e8f0',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${pctLicencia}%`,
                      height: '100%',
                      background: colorBarra,
                      borderRadius: '9999px',
                      transition: 'width 0.45s cubic-bezier(0.32, 0.72, 0, 1), background-color 0.35s ease',
                    }} />
                  </div>

                  <div className="kpi-grid">
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderTop: '3px solid #059669',
                      borderRadius: '12px',
                      padding: '0.52rem 0.68rem',
                    }}>
                      <div style={{ fontSize: '0.64rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#475569', fontWeight: 700 }}>
                        Aciertos
                      </div>
                      <div className="tabular-nums" style={{ fontSize: '1.18rem', fontWeight: 800, color: '#059669', marginTop: '0.05rem' }}>
                        {estadisticas.aciertos}
                        <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>/{estadisticas.total}</span>
                      </div>
                    </div>

                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderTop: '3px solid #d97706',
                      borderRadius: '12px',
                      padding: '0.52rem 0.68rem',
                    }}>
                      <div style={{ fontSize: '0.64rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#475569', fontWeight: 700 }}>
                        Multas
                      </div>
                      <div className="tabular-nums" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#d97706', marginTop: '0.05rem' }}>
                        ${estadisticas.multasAcumuladasUSD.toFixed(2)}
                      </div>
                    </div>

                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderTop: '3px solid #e11d48',
                      borderRadius: '12px',
                      padding: '0.52rem 0.68rem',
                    }}>
                      <div style={{ fontSize: '0.64rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#475569', fontWeight: 700 }}>
                        Puntos
                      </div>
                      <div className="tabular-nums" style={{ fontSize: '1.18rem', fontWeight: 800, color: '#e11d48', marginTop: '0.05rem' }}>
                        -{estadisticas.puntosPerdidos.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </header>

        {/* Module Switcher Navigation Placed Directly Above Active Workspace */}
        <nav className="island-nav" aria-label="Selector de módulo principal">
          <button
            onClick={() => setVista('simulador')}
            className={`island-tab ${vista === 'simulador' ? 'active' : ''}`}
            style={{
              background: vista === 'simulador'
                ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                : undefined,
              color: vista === 'simulador' ? '#ffffff' : undefined,
              boxShadow: vista === 'simulador' ? '0 8px 20px -4px rgba(5, 150, 105, 0.35)' : 'none',
            }}
          >
            <IconCompass />
            <span>Simulador Vial</span>
          </button>
          <button
            onClick={() => setVista('rag_agente')}
            className={`island-tab ${vista === 'rag_agente' ? 'active' : ''}`}
            style={{
              background: vista === 'rag_agente'
                ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
                : undefined,
              color: vista === 'rag_agente' ? '#ffffff' : undefined,
              boxShadow: vista === 'rag_agente' ? '0 8px 20px -4px rgba(217, 119, 6, 0.35)' : 'none',
            }}
          >
            <IconVectorNodes />
            <span>Consulta de Normativa</span>
          </button>
        </nav>

        {vista === 'simulador' && (
          <>
            {/* Interactive Road Role & Scenario Configuration Bar */}
            <section className="bezel-shell reveal-up" aria-label="Configuración del escenario vial">
              <div className="bezel-core" style={{ padding: '1.3rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.08rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.015em' }}>
                      1. Elige tu actor vial en la vía
                    </h2>
                    <p style={{ fontSize: '0.84rem', color: '#475569', marginTop: '0.1rem' }}>
                      Cada perfil presenta dilemas reales adaptados a sus obligaciones en el COIP.
                    </p>
                  </div>
                </div>

                {/* Visual Role Selector Cards */}
                <div className="role-grid" role="radiogroup" aria-label="Perfil del Ciudadano">
                  {CATALOGO_PERFILES.map((item) => {
                    const activo = perfil === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setPerfil(item.id)}
                        disabled={estado === 'cargando'}
                        className={`role-card ${activo ? 'active' : ''}`}
                        aria-pressed={activo}
                      >
                        <span className="role-icon-box">
                          <IconoPerfil id={item.id} />
                        </span>
                        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                            {item.titulo}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: activo ? '#047857' : '#64748b', fontWeight: 600, marginTop: '0.15rem' }}>
                            {item.subtitulo}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Difficulty Segmented Traffic-Light + Optional Topic + CTA */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '1.15rem',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  paddingTop: '0.35rem',
                  borderTop: '1px solid #f1f5f9',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.42rem' }}>
                    <label style={{ fontSize: '0.71rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
                      2. Nivel de complejidad
                    </label>
                    <div className="diff-pill-group" role="radiogroup" aria-label="Nivel de Dificultad">
                      {CATALOGO_DIFICULTAD.map((niv) => {
                        const activo = dificultad === niv.id;
                        return (
                          <button
                            key={niv.id}
                            type="button"
                            onClick={() => setDificultad(niv.id)}
                            disabled={estado === 'cargando'}
                            className={`diff-pill ${activo ? 'active' : ''}`}
                            aria-pressed={activo}
                          >
                            <span style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: niv.color,
                              boxShadow: activo ? `0 0 0 3px ${niv.color}28` : 'none',
                            }} />
                            <span>{niv.etiqueta}</span>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>· {niv.detalle}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.42rem', flex: 1, minWidth: '220px' }}>
                    <label style={{ fontSize: '0.71rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
                      3. Situación específica (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. semáforo, paso cebra, velocidad, celular..."
                      value={tema}
                      onChange={(e) => setTema(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && estado !== 'cargando' && estado !== 'reintentar') {
                          solicitarEscenario();
                        }
                      }}
                      disabled={estado === 'cargando'}
                      maxLength={100}
                      className="control-input"
                    />
                  </div>

                  <button
                    onClick={() => solicitarEscenario()}
                    disabled={estado === 'cargando' || estado === 'reintentar'}
                    className="btn-island"
                    style={{
                      background: estado === 'reintentar'
                        ? '#e2e8f0'
                        : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      color: estado === 'reintentar' ? '#475569' : '#ffffff',
                      boxShadow: estado === 'reintentar' ? 'none' : '0 10px 24px -6px rgba(5, 150, 105, 0.35)',
                      cursor: estado === 'cargando' || estado === 'reintentar' ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>
                      {estado === 'cargando'
                        ? 'Generando...'
                        : estado === 'reintentar'
                        ? `Espera ${cuentaRegresiva}s`
                        : 'Generar Escenario'}
                    </span>
                    <span className="btn-icon-wrap" style={{ color: estado === 'reintentar' ? '#475569' : '#ffffff' }}>
                      <IconArrowUpRight />
                    </span>
                  </button>
                </div>
              </div>
            </section>

            {estado === 'reintentar' && (
              <div className="bezel-shell reveal-up" style={{ borderColor: '#fcd34d' }}>
                <div className="bezel-core" style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.9rem',
                  color: '#92400e',
                  padding: '1.1rem 1.4rem',
                }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.95rem', color: '#78350f' }}>Demasiadas solicitudes</strong>
                    <span style={{ fontSize: '0.88rem', color: '#92400e' }}>
                      Espera <strong className="tabular-nums">{cuentaRegresiva} segundos</strong> antes de intentar de nuevo.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {estado === 'error_servidor' && (
              <div className="bezel-shell reveal-up" style={{ borderColor: '#fda4af' }}>
                <div className="bezel-core" style={{
                  background: '#fff1f2',
                  border: '1px solid #fecdd3',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.9rem',
                  color: '#9f1239',
                  padding: '1.1rem 1.4rem',
                }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.95rem', color: '#881337' }}>No se pudo completar la operación</strong>
                    <span style={{ fontSize: '0.88rem' }}>{mensajeError}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Skeleton Loading State */}
            {estado === 'cargando' && !escenario && (
              <div className="bezel-shell reveal-up">
                <div className="bezel-core" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  <div className="skeleton-bar" style={{ width: '240px', height: '22px' }} />
                  <div className="skeleton-bar" style={{ width: '92%', height: '32px' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} className="skeleton-bar" style={{ width: '100%', height: '58px', borderRadius: '16px' }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Quick-Launch Frequent Scenarios & 3-Step Visual Guide */}
            {estado === 'inactiva' && !escenario && (
              <div className="bezel-shell reveal-up">
                <div className="bezel-core" style={{
                  padding: '1.85rem 2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.35rem',
                }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Inicio rápido con 1 clic
                      </span>
                      <h2 style={{ fontSize: '1.18rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginTop: '0.15rem' }}>
                        Situaciones viales frecuentes en Ecuador
                      </h2>
                      <p style={{ color: '#475569', fontSize: '0.88rem', marginTop: '0.15rem' }}>
                        Selecciona cualquiera de estos casos reales para lanzar la simulación de inmediato, o usa el botón «Generar Escenario».
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
                    {TEMAS_RAPIDOS_SIMULADOR.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => solicitarEscenario(item.tema)}
                        className="example-chip"
                      >
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: item.color }} />
                        <span>{item.etiqueta}</span>
                      </button>
                    ))}
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                    gap: '0.75rem',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '1.15rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                      <span className="tabular-nums" style={{ width: '24px', height: '24px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>
                        1
                      </span>
                      <div>
                        <strong style={{ fontSize: '0.82rem', color: '#0f172a', display: 'block' }}>Analiza el dilema vial</strong>
                        <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Escenario contextualizado a tu perfil y nivel.</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                      <span className="tabular-nums" style={{ width: '24px', height: '24px', borderRadius: '8px', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>
                        2
                      </span>
                      <div>
                        <strong style={{ fontSize: '0.82rem', color: '#0f172a', display: 'block' }}>Toma una decisión (A–D)</strong>
                        <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Haz clic o usa las teclas A, B, C o D.</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                      <span className="tabular-nums" style={{ width: '24px', height: '24px', borderRadius: '8px', background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>
                        3
                      </span>
                      <div>
                        <strong style={{ fontSize: '0.82rem', color: '#0f172a', display: 'block' }}>Recibe dictamen COIP</strong>
                        <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Cálculo exacto de multa SBU, puntos y artículo.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {escenario && (
              <main ref={escenarioRef} className="bezel-shell reveal-up">
                <div className="bezel-core" style={{ padding: '1.75rem 2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.14em',
                        color: '#065f46',
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        padding: '0.3rem 0.75rem',
                        borderRadius: '9999px',
                      }}>
                        {escenario.perfil.replace('_', ' ')} · Dificultad {escenario.nivel_dificultad}
                      </span>
                      {escenario.dificultad_aplicada_por_progreso && (
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: '#5b21b6',
                          background: '#f5f3ff',
                          border: '1px solid #ddd6fe',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '9999px',
                        }}>
                          Nivel adaptado según tu progreso
                        </span>
                      )}
                    </div>
                    {!resultado && (
                      <span className="tabular-nums" style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        Atajo: teclas A, B, C o D
                      </span>
                    )}
                  </div>

                  <h2 style={{
                    fontSize: 'clamp(1.15rem, 2vw, 1.38rem)',
                    fontWeight: 600,
                    color: '#0f172a',
                    lineHeight: 1.55,
                    letterSpacing: '-0.015em',
                    marginBottom: '1.75rem',
                  }}>
                    {formatearEnunciado(escenario.situacion, tema)}
                  </h2>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.85rem' }}>
                    {escenario.opciones.map((opc) => {
                      const estaSeleccionada = opcionSeleccionada === opc.id_opcion;
                      let borde = estaSeleccionada ? '#059669' : '#e2e8f0';
                      let fondo = estaSeleccionada ? '#ecfdf5' : '#ffffff';

                      if (resultado) {
                        if (opc.id_opcion === resultado.respuesta_correcta) {
                          borde = '#059669';
                          fondo = '#ecfdf5';
                        } else if (estaSeleccionada && !resultado.es_correcta) {
                          borde = '#e11d48';
                          fondo = '#fff1f2';
                        }
                      }

                      return (
                        <button
                          key={opc.id_opcion}
                          onClick={() => !resultado && setOpcionSeleccionada(opc.id_opcion)}
                          disabled={!!resultado || estado === 'cargando'}
                          className="option-card"
                          style={{
                            background: fondo,
                            border: `1.5px solid ${borde}`,
                            cursor: resultado ? 'default' : 'pointer',
                          }}
                        >
                          <span
                            className="tabular-nums"
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '10px',
                              background: estaSeleccionada ? '#059669' : '#f1f5f9',
                              color: estaSeleccionada ? '#ffffff' : '#0f172a',
                              border: estaSeleccionada ? '1px solid #047857' : '1px solid #cbd5e1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.88rem',
                              flexShrink: 0,
                            }}
                          >
                            {opc.id_opcion}
                          </span>
                          <span style={{ marginTop: '0.18rem', lineHeight: 1.55, color: '#0f172a', fontWeight: estaSeleccionada ? 600 : 500 }}>
                            {opc.texto}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {!resultado && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={enviarRespuesta}
                        disabled={!opcionSeleccionada || estado === 'cargando'}
                        className="btn-island"
                        style={{
                          background: !opcionSeleccionada
                            ? '#f1f5f9'
                            : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                          color: !opcionSeleccionada ? '#94a3b8' : '#ffffff',
                          border: !opcionSeleccionada ? '1px solid #e2e8f0' : 'none',
                          cursor: !opcionSeleccionada ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <span>{estado === 'cargando' ? 'Evaluando...' : 'Confirmar Decisión'}</span>
                        <span className="btn-icon-wrap" style={{ color: !opcionSeleccionada ? '#94a3b8' : '#ffffff' }}>
                          <IconArrowUpRight />
                        </span>
                      </button>
                    </div>
                  )}

                  {resultado && (
                    <div
                      className="reveal-up"
                      style={{
                        marginTop: '2rem',
                        borderTop: '1px solid #e2e8f0',
                        paddingTop: '1.85rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.25rem',
                      }}
                    >
                      {/* Official Ficha Normativa Card */}
                      <div style={{
                        background: resultado.es_correcta ? '#ecfdf5' : '#fff1f2',
                        border: `1.5px solid ${resultado.es_correcta ? '#6ee7b7' : '#fda4af'}`,
                        borderRadius: '20px',
                        padding: '1.6rem',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
                          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: resultado.es_correcta ? '#065f46' : '#9f1239', letterSpacing: '-0.02em' }}>
                            {resultado.es_correcta ? 'Decisión correcta conforme a la ley' : 'Conducta sancionada por la ley'}
                          </h3>
                          <span className="tabular-nums" style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.25rem 0.7rem',
                            borderRadius: '9999px',
                            background: '#ffffff',
                            color: resultado.es_correcta ? '#065f46' : '#9f1239',
                            border: `1px solid ${resultado.es_correcta ? '#a7f3d0' : '#fecdd3'}`,
                          }}>
                            {resultado.contravencion.articulo} · {resultado.contravencion.norma}
                          </span>
                        </div>

                        <p style={{ color: '#1e293b', fontSize: '0.98rem', lineHeight: 1.65, marginBottom: '1.35rem' }}>
                          {resultado.explicacion_educativa}
                        </p>

                        <div style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '16px',
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.85rem',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#475569', fontWeight: 700 }}>
                                Ficha de Tipificación Legal
                              </span>
                              <div className="tabular-nums" style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.96rem', marginTop: '0.2rem' }}>
                                {resultado.contravencion.articulo} · {resultado.contravencion.clase}
                              </div>
                            </div>
                            <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
                              {resultado.contravencion.norma} · RO 512 (2021)
                            </span>
                          </div>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                            gap: '0.65rem',
                            borderTop: '1px solid #e2e8f0',
                            paddingTop: '0.85rem',
                          }}>
                            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '0.65rem 0.8rem' }}>
                              <div style={{ fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#92400e', fontWeight: 700 }}>
                                Multa Económica
                              </div>
                              <div className="tabular-nums" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#b45309', marginTop: '0.1rem' }}>
                                ${resultado.sancion.multa_usd.toFixed(2)} USD
                              </div>
                            </div>
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.65rem 0.8rem' }}>
                              <div style={{ fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569', fontWeight: 700 }}>
                                Equivalencia SBU ($482)
                              </div>
                              <div className="tabular-nums" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '0.1rem' }}>
                                {Math.round((resultado.sancion.multa_usd / resultado.sancion.sbu_usd) * 10000) / 100}% del SBU
                              </div>
                            </div>
                            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', padding: '0.65rem 0.8rem' }}>
                              <div style={{ fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9f1239', fontWeight: 700 }}>
                                Impacto en Licencia
                              </div>
                              <div className="tabular-nums" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#be123c', marginTop: '0.1rem' }}>
                                -{resultado.sancion.puntos_reducidos} puntos
                              </div>
                            </div>
                          </div>
                        </div>

                        {resultado.contravencion.texto_literal_coip && (
                          <div style={{
                            marginTop: '1.1rem',
                            padding: '0.95rem 1.15rem',
                            borderRadius: '12px',
                            background: '#ffffff',
                            border: '1px solid #a7f3d0',
                            borderLeft: '4px solid #059669',
                            fontSize: '0.88rem',
                            color: '#1e293b',
                          }}>
                            <strong style={{ color: '#065f46', display: 'block', marginBottom: '0.25rem' }}>
                              Fuente legal ({resultado.contravencion.articulo} · {resultado.contravencion.norma}):
                            </strong>
                            «{resultado.contravencion.texto_literal_coip}»
                          </div>
                        )}
                      </div>

                      <details className="tech-details">
                        <summary>
                          <span>Detalles técnicos</span>
                          <span className="tabular-nums">▾</span>
                        </summary>
                        <div className="tech-details-body" style={{ fontSize: '0.8rem', color: '#475569' }}>
                          <div className="tabular-nums">
                            ID escenario: {escenario.id_escenario} · Contravención: {resultado.contravencion.id_contravencion} ({resultado.contravencion.codigo_csv || 'COIP'})
                          </div>
                          <div>{resultado.aviso}</div>
                        </div>
                      </details>

                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => solicitarEscenario()}
                          className="btn-island"
                          style={{
                            background: '#0f172a',
                            color: '#ffffff',
                          }}
                        >
                          <span>Siguiente Escenario</span>
                          <span className="btn-icon-wrap" style={{ color: '#ffffff' }}>
                            <IconArrowUpRight />
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </main>
            )}
          </>
        )}

        {vista === 'rag_agente' && (
          <section className="bezel-shell reveal-up" aria-label="Consulta de normativa">
            <div className="bezel-core" style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
              <div>
                <h2 style={{ fontSize: 'clamp(1.3rem, 2.2vw, 1.55rem)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em' }}>
                  Consulta de infracciones y multas
                </h2>
                <p style={{ color: '#475569', fontSize: '0.92rem', marginTop: '0.2rem' }}>
                  Pregunta con tus propias palabras sobre multas, puntos y normas de tránsito.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Casos frecuentes para consultar con un clic
                </span>
                <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
                  {EJEMPLOS_SEMANA3.map((ej, idx) => {
                    const activo = preguntaChat === ej.pregunta;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setPreguntaChat(ej.pregunta);
                          setDemoEnvenenado(ej.envenenado);
                          enviarConsultaRAG(ej.pregunta, ej.envenenado);
                        }}
                        className={`example-chip ${activo ? 'active' : ''}`}
                      >
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: ej.colorPunto }} />
                        <span>{ej.etiqueta}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={preguntaChat}
                  onChange={(e) => setPreguntaChat(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !cargandoChat) {
                      enviarConsultaRAG();
                    }
                  }}
                  placeholder="Ej. Me pasé un semáforo en rojo, ¿cuánto debo pagar?"
                  className="control-input"
                  style={{ flex: 1, minWidth: '260px' }}
                />
                <button
                  onClick={() => enviarConsultaRAG()}
                  disabled={cargandoChat}
                  className="btn-island"
                  style={{
                    background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                    color: '#ffffff',
                    boxShadow: '0 10px 24px -6px rgba(217, 119, 6, 0.35)',
                    cursor: cargandoChat ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span>{cargandoChat ? 'Consultando...' : 'Consultar norma'}</span>
                  <span className="btn-icon-wrap" style={{ color: '#ffffff' }}>
                    <IconArrowUpRight />
                  </span>
                </button>
              </div>

              {cargandoChat && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div className="skeleton-bar" style={{ width: '100%', height: '48px', borderRadius: '14px' }} />
                  <div className="skeleton-bar" style={{ width: '100%', height: '140px', borderRadius: '18px' }} />
                </div>
              )}

              {respuestaChat && !cargandoChat && (
                <div className="reveal-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                  {/* Respuesta principal visible al ciudadano */}
                  <div style={{
                    background: respuestaChat.abstencion ? '#fff1f2' : '#ecfdf5',
                    border: `1.5px solid ${respuestaChat.abstencion ? '#fda4af' : '#6ee7b7'}`,
                    borderRadius: '18px',
                    padding: '1.45rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.55rem' }}>
                      <strong style={{ color: respuestaChat.abstencion ? '#9f1239' : '#065f46', fontSize: '1.05rem' }}>
                        {respuestaChat.abstencion
                          ? 'Orientación institucional'
                          : `Fuente legal: ${respuestaChat.citas.join(', ')}`}
                      </strong>
                      {!respuestaChat.abstencion && (
                        <span className="tabular-nums" style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.22rem 0.65rem',
                          borderRadius: '9999px',
                          background: '#ffffff',
                          color: '#065f46',
                          border: '1px solid #a7f3d0',
                        }}>
                          RO 512 · Vigente
                        </span>
                      )}
                    </div>

                    <p style={{ color: '#0f172a', lineHeight: 1.65, margin: 0 }}>
                      {formatearRespuestaCiudadana(respuestaChat.respuesta)}
                    </p>

                    {respuestaChat.sancion_calculada && (
                      <div
                        className="tabular-nums"
                        style={{
                          marginTop: '1.1rem',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '14px',
                          padding: '0.95rem 1.1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.65rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#475569', fontWeight: 700 }}>
                            Ficha de Tipificación Legal ({respuestaChat.sancion_calculada.articulo})
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                            {respuestaChat.sancion_calculada.clase}
                          </span>
                        </div>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
                          gap: '0.6rem',
                        }}>
                          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '0.55rem 0.75rem' }}>
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#92400e', fontWeight: 700 }}>
                              Multa Económica
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#b45309', marginTop: '0.1rem' }}>
                              ${respuestaChat.sancion_calculada.multa_usd.toFixed(2)} USD
                            </div>
                          </div>
                          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.55rem 0.75rem' }}>
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569', fontWeight: 700 }}>
                              Equivalencia SBU ($482)
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginTop: '0.1rem' }}>
                              {Math.round((respuestaChat.sancion_calculada.multa_usd / respuestaChat.sancion_calculada.sbu_referencia_usd) * 10000) / 100}% del SBU
                            </div>
                          </div>
                          <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '10px', padding: '0.55rem 0.75rem' }}>
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9f1239', fontWeight: 700 }}>
                              Impacto en Licencia
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#be123c', marginTop: '0.1rem' }}>
                              -{respuestaChat.sancion_calculada.puntos_texto_coip} puntos
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Acción real: permanece pendiente en servidor hasta confirmar o descartar. */}
                  {respuestaChat.accion_pendiente && (
                    <div style={{
                      background: confirmacionHumana === 'confirmada'
                        ? '#ecfdf5'
                        : confirmacionHumana === 'descartada'
                        ? '#fff1f2'
                        : '#f8fafc',
                      border: `1px solid ${
                        confirmacionHumana === 'confirmada'
                          ? '#6ee7b7'
                          : confirmacionHumana === 'descartada'
                          ? '#fda4af'
                          : '#cbd5e1'
                      }`,
                      borderRadius: '18px',
                      padding: '1.1rem 1.35rem',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                    }}>
                      <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0f172a' }}>
                        {confirmacionHumana === 'pendiente' && respuestaChat.accion_pendiente.descripcion}
                        {confirmacionHumana === 'confirmada' && `Consulta registrada en el progreso: ${respuestaChat.accion_pendiente.articulo}.`}
                        {confirmacionHumana === 'descartada' && 'Acción descartada: el progreso no fue modificado.'}
                      </div>

                      {confirmacionHumana === 'pendiente' ? (
                        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => resolverConfirmacionChat('confirmar')}
                            disabled={procesandoConfirmacion}
                            className="btn-island"
                            style={{
                              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                              color: '#ffffff',
                              padding: '0.45rem 0.55rem 0.45rem 1.1rem',
                              fontSize: '0.84rem',
                            }}
                          >
                            <span>{procesandoConfirmacion ? 'Procesando…' : 'Confirmar y registrar'}</span>
                            <span className="btn-icon-wrap" style={{ color: '#ffffff', width: '26px', height: '26px' }}>
                              <IconArrowUpRight />
                            </span>
                          </button>
                          <button
                            onClick={() => resolverConfirmacionChat('descartar')}
                            disabled={procesandoConfirmacion}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              borderRadius: '9999px',
                              padding: '0.45rem 1rem',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Descartar
                          </button>
                        </div>
                      ) : (
                        <span className="tabular-nums" style={{
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          padding: '0.3rem 0.75rem',
                          borderRadius: '9999px',
                          background: confirmacionHumana === 'confirmada' ? '#d1fae5' : '#ffe4e6',
                          color: confirmacionHumana === 'confirmada' ? '#065f46' : '#9f1239',
                        }}>
                          {confirmacionHumana === 'confirmada' ? 'APROBADO' : 'DESCARTADO'}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Panel plegable de Detalles técnicos (cerrado por defecto) */}
                  <details className="tech-details">
                    <summary>
                      <span>Detalles técnicos</span>
                      <span className="tabular-nums">▾</span>
                    </summary>
                    <div className="tech-details-body">
                      <div
                        className="tabular-nums"
                        style={{
                          background: '#fffbeb',
                          border: '1px solid #fde68a',
                          borderRadius: '12px',
                          padding: '0.75rem 1rem',
                          color: '#92400e',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                        }}
                      >
                        {formatearTextoTecnico(respuestaChat.resumen_clase)}
                      </div>

                      <div className="tabular-nums" style={{ fontSize: '0.78rem', color: '#475569' }}>
                        Mejor distancia coseno: {respuestaChat.mejor_distancia.toFixed(2)} · Umbral: {respuestaChat.umbral_distancia ?? 0.45} · Modelo: {respuestaChat.modelo_embeddings || 'intfloat/multilingual-e5-small'}
                      </div>

                      {respuestaChat.alerta_seguridad && (
                        <div style={{
                          background: '#fff1f2',
                          border: '1px solid #fda4af',
                          borderRadius: '12px',
                          padding: '0.85rem 1rem',
                          color: '#9f1239',
                          fontSize: '0.84rem',
                        }}>
                          <strong>Defensa de seguridad activa:</strong> {formatearTextoTecnico(respuestaChat.alerta_seguridad)}
                        </div>
                      )}

                      {respuestaChat.fragmentos.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>
                            Fragmentos normativos recuperados (Top-5)
                          </strong>
                          {respuestaChat.fragmentos.map((f) => (
                            <div
                              key={f.id}
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                padding: '0.65rem 0.85rem',
                                fontSize: '0.8rem',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.2rem' }}>
                                <span>#{f.puesto} · {f.documento} — Art. {f.articulo} ({f.id})</span>
                                <span className="tabular-nums" style={{ color: '#b45309', fontSize: '0.75rem' }}>
                                  distancia: {f.distancia.toFixed(2)} | vigente: {String(f.metadatos.vigente)}
                                </span>
                              </div>
                              <div style={{ color: '#475569', fontSize: '0.78rem' }}>
                                {f.texto.slice(0, 220)}{f.texto.length > 220 ? '…' : ''}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '0.85rem',
                      }}>
                        <div style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '0.9rem',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <strong style={{ color: '#065f46', fontSize: '0.82rem' }}>Bitácora del Agente</strong>
                            <span className="tabular-nums" style={{ fontSize: '0.76rem', color: '#b45309' }}>
                              Pasos: {respuestaChat.agente.vueltas_usadas} / {respuestaChat.agente.tope_vueltas}
                              {respuestaChat.agente.llamadas_modelo !== undefined
                                ? ` · LLM: ${respuestaChat.agente.llamadas_modelo} / ${respuestaChat.agente.max_llamadas_modelo}`
                                : ''}
                            </span>
                          </div>
                          {respuestaChat.agente.bitacora.map((b, idx) => (
                            <div key={idx} style={{ fontSize: '0.76rem', color: '#334155', marginBottom: '0.4rem', borderLeft: '1px solid #059669', paddingLeft: '0.55rem' }}>
                              <strong className="tabular-nums" style={{ color: '#0f172a' }}>
                                Paso {b.vuelta} ({ETIQUETAS_HERRAMIENTAS[b.herramienta] || formatearTextoTecnico(b.herramienta)}):
                              </strong>{' '}
                              {formatearTextoTecnico(b.detalle)}
                            </div>
                          ))}
                        </div>

                        <div style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '0.9rem',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <strong style={{ color: '#5b21b6', fontSize: '0.82rem' }}>Flujo de Automatización</strong>
                            <span className="tabular-nums" style={{ fontSize: '0.76rem', color: '#6d28d9' }}>
                              Confianza: {(respuestaChat.automatizacion.confianza * 100).toFixed(0)}%
                            </span>
                          </div>
                          {respuestaChat.automatizacion.estaciones.map((st, idx) => (
                            <div key={idx} style={{ fontSize: '0.76rem', color: '#334155', marginBottom: '0.4rem', borderLeft: '1px solid #7c3aed', paddingLeft: '0.55rem' }}>
                              <strong style={{ color: '#0f172a' }}>{st.estacion} [{st.actor}]:</strong> {formatearTextoTecnico(st.resultado)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </details>
                </div>
              )}
            </div>
          </section>
        )}

        <footer style={{
          marginTop: 'auto',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '1.5rem',
          fontSize: '0.82rem',
          color: '#64748b',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: '1rem',
        }}>
          <span>Universidad Regional Autónoma de los Andes (UNIANDES)</span>
          <span>Orientación educativa · No solicita datos personales.</span>
        </footer>
      </div>
    </>
  );
}
