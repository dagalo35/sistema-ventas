'use client'

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { toast, Toaster } from "sonner"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function AdminPedidos() {

  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)

  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [fechaInicio, setFechaInicio] = useState("")
  const [fechaFin, setFechaFin] = useState("")

  const [viewImg, setViewImg] = useState(null)

  useEffect(() => {
    getPedidos()
  }, [])

  async function getPedidos() {

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch('/api/pedidos', {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    })

    // Validar si la respuesta es JSON antes de parsear
    const contentType = res.headers.get("content-type");
    if (!res.ok) {
      let errorMsg = "Error desconocido";
      if (contentType && contentType.includes("application/json")) {
        const errorData = await res.json();
        errorMsg = errorData.error || errorMsg;
      } else {
        errorMsg = await res.text();
      }
      console.error("Error en admin pedidos:", errorMsg);
      setLoading(false);
      return;
    }

    const data = await res.json()

    if (!data.error) {
      setPedidos(data)
    }

    setLoading(false)
  }

  async function cambiarEstado(pedidoId, nuevoEstado) {
    const { data: { session } } = await supabase.auth.getSession()

    const updatePromise = (async () => {
      const res = await fetch('/api/pedidos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ pedido_id: pedidoId, estado: nuevoEstado })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al actualizar")
      getPedidos()
      return data
    })()

    toast.promise(updatePromise, {
      loading: 'Actualizando pedido...',
      success: 'Estado actualizado correctamente ✅',
      error: (err) => `Error: ${err.message} ❌`
    })
  }

  function agrupar(arr) {
    const c = {}
    arr?.forEach(p => c[p] = (c[p] || 0) + 1)
    return c
  }

  // 🔥 LÓGICA DE FILTRADO DINÁMICO
  const pedidosFiltrados = pedidos.filter(p => {
    const matchEstado = filtroEstado === "todos" || p.estado === filtroEstado;
    
    // Comparar solo la parte de la fecha (YYYY-MM-DD)
    const fechaPedido = new Date(p.created_at).toISOString().split('T')[0];
    const matchInicio = !fechaInicio || fechaPedido >= fechaInicio;
    const matchFin = !fechaFin || fechaPedido <= fechaFin;

    return matchEstado && matchInicio && matchFin;
  });

  // 🔥 EXPORTAR CSV
  function exportarExcel() {
    if (pedidosFiltrados.length === 0) {
      toast.warning("No hay pedidos que coincidan con los filtros")
      return
    }

    const filas = pedidosFiltrados.map(p => ({
      ID: p.id,
      Usuario: p.users ? `${p.users.nombre} ${p.users.apellidos} (${p.users.codigo})` : p.user_id,
      Total: p.total,
      Estado: p.estado,
      Metodo: p.metodo_pago,
      Entrega: p.tipo_entrega,
      Fecha: new Date(p.created_at).toLocaleString(),
      Productos: p.productos?.join(", ")
    }))

    const encabezados = Object.keys(filas[0]).join(",")
    const contenido = filas.map(f => Object.values(f).join(",")).join("\n")

    const csv = encabezados + "\n" + contenido

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    link.download = "pedidos.csv"
    link.click()
  }

  if (loading) return <p>Cargando...</p>

  return (
    <div style={{ padding: 20 }}>
      <Toaster richColors position="top-right" />

      <h1>📦 Historial de Pedidos (Admin)</h1>

      {/* 🔥 FILTROS */}
      <div style={styles.filterContainer}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Estado:</label>
          <select 
            style={styles.filterInput}
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="todos">Todos los estados</option>
            <option value="enviado">Pendiente</option>
            <option value="pendiente_pago">Pendiente Pago</option>
            <option value="aprobado">Aprobado</option>
            <option value="empaquetado">Empaquetado</option>
            <option value="listo_recojo">Listo Recojo</option>
            <option value="rechazado">Rechazado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Desde:</label>
          <input 
            type="date" 
            style={styles.filterInput}
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Hasta:</label>
          <input 
            type="date" 
            style={styles.filterInput}
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
          />
        </div>

        <button onClick={exportarExcel} style={styles.exportBtn}>
          📥 Exportar CSV
        </button>

        {(filtroEstado !== "todos" || fechaInicio || fechaFin) && (
          <button 
            onClick={() => { setFiltroEstado("todos"); setFechaInicio(""); setFechaFin(""); }} 
            style={styles.clearBtn}
          >
            Limpiar Filtros
          </button>
        )}
      </div>

      {/* LISTA */}
      <div style={styles.history}>
        {pedidosFiltrados.map((p, i) => {
          const productos = Object.entries(agrupar(p.productos))
            .map(([n, c]) => `${n} x${c}`)
            .join(", ")

          return (
            <div key={p.id} style={styles.orderCard}>
              <div style={styles.header}>
                <strong>Pedido #{i + 1}</strong>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{
                    ...styles.estado,
                    background:
                      p.estado === "aprobado" ? "#16a34a" :
                      p.estado === "listo_recojo" ? "#2563eb" :
                      p.estado === "rechazado" ? "#991b1b" :
                      p.estado === "cancelado" ? "#dc2626" :
                      "#f59e0b"
                  }}>
                    {p.estado}
                  </span>
                  
                  <select 
                    style={styles.adminSelect}
                    value={p.estado}
                    onChange={(e) => cambiarEstado(p.id, e.target.value)}
                  >
                    <option value="enviado">Pendiente</option>
                    <option value="pendiente_pago">Pendiente Pago</option>
                    <option value="aprobado">Aprobar</option>
                    <option value="empaquetado">Empaquetado</option>
                    <option value="listo_recojo">Listo Recojo</option>
                    <option value="rechazado">Rechazar</option>
                  </select>
                </div>
              </div>

              <div style={styles.gridInfo}>
                <div>
                  <p style={styles.label}>Detalle:</p>
                  <p>{productos}</p>
                </div>
                <div>
                  <p style={styles.label}>Logística:</p>
                  <p>🚚 {p.tipo_entrega || "N/A"} | 💳 {p.metodo_pago || "N/A"}</p>
                </div>
                {p.users && (
                  <div>
                    <p style={styles.label}>Cliente:</p>
                    <p>👤 {p.users.nombre} {p.users.apellidos} ({p.users.codigo})</p>
                  </div>
                )}
                <div>
                  <p style={styles.label}>Monto:</p>
                  <p><strong>S/ {p.total}</strong></p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 15 }}>
                <div>
                  <p style={styles.fecha}>
                    {new Date(p.created_at).toLocaleString()}
                  </p>
                  {p.comprobante_url && (
                    <button 
                      onClick={() => setViewImg(p.comprobante_url)}
                      style={styles.btnEye}
                    >
                      👁️ Ver Comprobante
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* MODAL VISTA PREVIA COMPROBANTE */}
      {viewImg && (
        <div style={styles.overlay} onClick={() => setViewImg(null)}>
          <div style={styles.modalImg} onClick={e => e.stopPropagation()}>
            <img src={viewImg} alt="Comprobante" style={{ width: '100%', borderRadius: 10, marginBottom: 15 }} />
            <button style={styles.btnConfirm} onClick={() => setViewImg(null)}>Cerrar Vista</button>
          </div>
        </div>
      )}

    </div>
  )
}

const styles = {
  history: {
    display: "grid",
    gap: 20
  },
  filterContainer: {
    display: "flex",
    gap: "15px",
    background: "white",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "20px",
    alignItems: "flex-end",
    flexWrap: "wrap",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
  },
  filterGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "5px"
  },
  filterLabel: {
    fontSize: "10px",
    fontWeight: "bold",
    color: "#6b7280",
    textTransform: "uppercase"
  },
  filterInput: {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    fontSize: "13px",
    outline: "none"
  },
  exportBtn: {
    background: "#2563eb",
    color: "white",
    padding: "9px 15px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600"
  },
  clearBtn: {
    padding: "9px 15px",
    background: "#f3f4f6",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    cursor: "pointer",
    color: "#4b5563"
  },
  orderCard: {
    background: "white",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    borderLeft: "6px solid #e5e7eb"
  },
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000
  },
  btnConfirm: {
    background: "#16a34a",
    color: "white",
    padding: "10px 20px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    borderBottom: "1px solid #f3f4f6",
    paddingBottom: 10
  },
  estado: {
    color: "white",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "bold",
    textTransform: "uppercase"
  },
  adminSelect: {
    padding: "4px 8px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    fontSize: "12px",
    outline: "none",
    cursor: "pointer",
    background: "#fff"
  },
  gridInfo: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 20,
    marginTop: 10
  },
  label: {
    fontSize: "10px",
    color: "#9ca3af",
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: "4px"
  },
  fecha: {
    fontSize: "12px",
    color: "#6b7280"
  },
  imgComp: {
    width: 100,
    height: 100,
    objectFit: "cover",
    borderRadius: "8px",
    marginTop: "10px",
    cursor: "zoom-in"
  },
  btnEye: {
    marginTop: 10,
    background: "#f3f4f6",
    border: "1px solid #d1d5db",
    padding: "5px 12px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  modalImg: {
    background: "white",
    padding: 20,
    borderRadius: 15,
    maxWidth: "450px",
    width: "90%",
    textAlign: "center"
  }
}