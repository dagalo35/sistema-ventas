'use client'

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function AdminPedidos() {

  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(false)
  const [imagenModal, setImagenModal] = useState(null)

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

    const data = await res.json()

    if (!data.error) {
      const ordenados = data.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      )
      setPedidos(ordenados)
    }
  }

  // =========================
  // 🔥 CAMBIAR ESTADO
  // =========================
  async function cambiarEstado(id, estado) {

    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()

    const res = await fetch('/api/pedidos/admin', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        pedido_id: id,
        estado
      })
    })

    const data = await res.json()

    alert(data.message || data.error)

    getPedidos()
    setLoading(false)
  }

  // =========================
  // 🔥 UI
  // =========================
  return (
    <div style={styles.container}>

      <h1>👑 Panel Admin - Pedidos</h1>

      <div style={styles.tableHeader}>
        <span>#</span>
        <span>Productos</span>
        <span>Total</span>
        <span>Estado</span>
        <span>Comprobante</span>
        <span>Acciones</span>
      </div>

      {pedidos.map((p, i) => {

        const productos = Array.isArray(p.productos)
          ? p.productos.join(", ")
          : ""

        return (
          <div key={p.id} style={styles.row}>

            <span>{i + 1}</span>
            <span>{productos}</span>
            <span>S/ {p.total}</span>

            <span style={{ color: getColor(p.estado) }}>
              {p.estado}
            </span>

            <span>
              {p.comprobante_url && (
                <button
                  style={styles.btnView}
                  onClick={() => setImagenModal(p.comprobante_url)}
                >
                  Ver
                </button>
              )}
            </span>

            <span style={styles.actions}>

              {p.estado === "enviado" && (
                <>
                  <button onClick={() => cambiarEstado(p.id, "aprobado")}>
                    ✅ Aprobar
                  </button>

                  <button onClick={() => cambiarEstado(p.id, "rechazado")}>
                    ❌ Rechazar
                  </button>
                </>
              )}

              {p.estado === "aprobado" && (
                <button onClick={() => cambiarEstado(p.id, "empaquetado")}>
                  📦 Empaquetar
                </button>
              )}

              {p.estado === "empaquetado" && (
                <button onClick={() => cambiarEstado(p.id, "listo_recojo")}>
                  🏪 Listo
                </button>
              )}

            </span>

          </div>
        )
      })}

      {/* 🔥 MODAL IMAGEN */}
      {imagenModal && (
        <div style={styles.modal} onClick={() => setImagenModal(null)}>
          <img src={imagenModal} style={styles.modalImg} />
        </div>
      )}

    </div>
  )
}

// =========================
// 🎨 ESTILOS PRO
// =========================
const styles = {
  container: {
    padding: 30,
    background: "#f3f4f6",
    minHeight: "100vh"
  },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "0.5fr 2fr 1fr 1fr 1fr 2fr",
    fontWeight: "bold",
    marginTop: 20
  },

  row: {
    display: "grid",
    gridTemplateColumns: "0.5fr 2fr 1fr 1fr 1fr 2fr",
    background: "white",
    padding: 10,
    marginTop: 10,
    borderRadius: 10
  },

  actions: {
    display: "flex",
    gap: 5,
    flexWrap: "wrap"
  },

  btnView: {
    background: "#3b82f6",
    color: "white",
    border: "none",
    padding: "5px 10px",
    borderRadius: 6,
    cursor: "pointer"
  },

  modal: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.8)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  modalImg: {
    maxWidth: "80%",
    maxHeight: "80%",
    borderRadius: 10
  }
}

// =========================
// 🎨 COLOR ESTADO
// =========================
function getColor(estado) {
  switch (estado) {
    case "enviado": return "#3b82f6"
    case "aprobado": return "#16a34a"
    case "empaquetado": return "#f59e0b"
    case "listo_recojo": return "#10b981"
    case "rechazado": return "#dc2626"
    default: return "#6b7280"
  }
}