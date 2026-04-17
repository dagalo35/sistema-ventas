'use client'

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { toast, Toaster } from "sonner"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function AdminComisiones() {
  const [comisiones, setComisiones] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Filtros
  const [filtroTipo, setFiltroTipo] = useState("todos")
  const [fechaInicio, setFechaInicio] = useState("")
  const [fechaFin, setFechaFin] = useState("")

  useEffect(() => {
    getComisiones()
  }, [])

  async function getComisiones() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/comisiones', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })

      // Validar si la respuesta es JSON antes de parsear
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const errorText = await res.text();
        console.error(`Error ${res.status}: Respuesta no es JSON`, errorText.substring(0, 100));
        throw new Error(res.status === 404 
          ? "Error 404: No se encontró la ruta de API. Reinicia el servidor." 
          : "La respuesta del servidor no es válida.");
      }

      const data = await res.json()

      if (data.error) {
        toast.error(data.error)
      } else {
        setComisiones(data)
      }
    } catch (err) {
      console.error("Error:", err)
      toast.error("Error al obtener el historial de comisiones")
    } finally {
      setLoading(false)
    }
  }

  const filtradas = comisiones.filter(c => {
    const tipoNormalizado = c.tipo?.toLowerCase().replace(' ', '_');
    const filtroNormalizado = filtroTipo.toLowerCase();
    const matchTipo = filtroTipo === "todos" || tipoNormalizado === filtroNormalizado;

    const fechaComision = new Date(c.created_at).toISOString().split('T')[0]
    const matchInicio = !fechaInicio || fechaComision >= fechaInicio
    const matchFin = !fechaFin || fechaComision <= fechaFin
    return matchTipo && matchInicio && matchFin
  })

  function exportarCSV() {
    if (filtradas.length === 0) return toast.warning("No hay datos para exportar")
    const filas = filtradas.map(c => ({
      Fecha: new Date(c.created_at).toLocaleString(),
      Beneficiario: c.beneficiary ? `${c.beneficiary.nombre} (${c.beneficiary.codigo})` : 'N/A',
      Origen: c.origin ? `${c.origin.nombre} (${c.origin.codigo})` : 'N/A',
      Monto: c.monto,
      Descripcion: c.descripcion,
      Tipo: c.tipo
    }))
    const headers = Object.keys(filas[0]).join(",")
    const body = filas.map(f => Object.values(f).join(",")).join("\n")
    const blob = new Blob([headers + "\n" + body], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "comisiones_global.csv"; a.click()
  }

  if (loading) return <p style={{ padding: 20 }}>Cargando historial...</p>

  return (
    <div style={styles.container}>
      <Toaster richColors position="top-right" />
      
      <h1>💰 Historial Global de Comisiones</h1>

      <div style={styles.filterBar}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Tipo:</label>
          <select style={styles.select} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="bono_directo">Bono Directo</option>
            <option value="bono_red">Bono de Red</option>
            <option value="compra_propia">Compra Propia</option>
            <option value="ajuste">Ajustes</option>
          </select>
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Desde:</label>
          <input type="date" style={styles.select} value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Hasta:</label>
          <input type="date" style={styles.select} value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
        </div>
        <button onClick={exportarCSV} style={styles.btnExport}>📥 Exportar CSV</button>
      </div>

      <div style={styles.list}>
        {filtradas.map((c) => (
          <div key={c.id} style={styles.card}>
            <div style={styles.header}>
              <span style={styles.monto}>S/ {Number(c.monto).toFixed(2)}</span>
              <span style={{...styles.badge, background: c.monto > 0 ? '#dcfce7' : '#fee2e2', color: c.monto > 0 ? '#166534' : '#991b1b'}}>
                {c.tipo?.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <div style={styles.gridInfo}>
              <div>
                <p style={styles.label}>Concepto</p>
                <p style={styles.val}>{c.descripcion}</p>
              </div>
              <div>
                <p style={styles.label}>Beneficiario</p>
                <p style={styles.val}>💰 {c.beneficiary?.nombre} ({c.beneficiary?.codigo})</p>
              </div>
              <div>
                <p style={styles.label}>Origen / Nivel</p>
                <p style={styles.val}>👤 {c.origin?.nombre || 'Propio'} (L{c.nivel})</p>
              </div>
              <div>
                <p style={styles.label}>Pedido Ref.</p>
                <p style={styles.val}># {c.pedido_id || 'N/A'}</p>
              </div>
              <div>
                <p style={styles.label}>Fecha</p>
                <p style={styles.val}>{new Date(c.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  container: { padding: 20 },
  filterBar: { display: 'flex', gap: 15, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end', background: 'white', padding: 15, borderRadius: 12 },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: 5 },
  filterLabel: { fontSize: 10, fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' },
  select: { padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 },
  btnExport: { background: '#2563eb', color: 'white', border: 'none', padding: '9px 15px', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', marginTop: 10 },
  list: { display: 'grid', gap: 15 },
  card: { background: 'white', padding: 20, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: '6px solid #16a34a' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  monto: { fontSize: 20, fontWeight: 'bold', color: '#16a34a' },
  badge: { padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 'bold' },
  gridInfo: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 15 },
  label: { fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 4 },
  val: { fontSize: 13, color: '#374151' }
}