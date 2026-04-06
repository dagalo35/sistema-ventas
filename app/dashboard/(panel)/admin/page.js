'use client'

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default function AdminDashboard() {
  const [userData, setUserData] = useState(null)

  const [totalVentas, setTotalVentas] = useState(0)
  const [totalComisiones, setTotalComisiones] = useState(0)
  const [pendientes, setPendientes] = useState(0)
  const [usuariosActivos, setUsuariosActivos] = useState(0)

  const [pedidos, setPedidos] = useState([])
  const [comisiones, setComisiones] = useState([])

  const router = useRouter()

  useEffect(() => {
    init()
  }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    const authUser = session?.user

    if (!authUser) {
      router.push("/login")
      return
    }

    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("supabase_id", authUser.id)
      .single()

    if (user.role !== "admin") {
      router.push("/dashboard")
      return
    }

    setUserData(user)

    await Promise.all([
      getKPIs(),
      getPedidos(),
      getComisiones()
    ])
  }

  const getEstado = (estado) => estado?.toLowerCase()

  const getColor = (estado) => {
    const e = getEstado(estado)
    if (e === "aprobado") return "green"
    if (e === "pendiente") return "orange"
    if (e === "rechazado") return "red"
    return "gray"
  }

  const getLabel = (estado) => {
    const e = getEstado(estado)
    if (e === "aprobado") return "Aprobado ✅"
    if (e === "pendiente") return "Pendiente ⏳"
    if (e === "rechazado") return "Rechazado ❌"
    return estado
  }

  async function aprobarPedido(id) {
    const confirmar = confirm("¿Aprobar este pedido?")
    if (!confirmar) return

    const { data: { session } } = await supabase.auth.getSession()

    const res = await fetch('/api/pedidos/aprobar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ pedido_id: id })
    })

    const data = await res.json()
    alert(data.message || data.error)

    await getKPIs()
    await getPedidos()
  }

  async function getKPIs() {
    const { data: pedidos } = await supabase
      .from("pedidos")
      .select("total, estado")

    let ventas = 0
    let pend = 0

    pedidos?.forEach(p => {
      const estado = getEstado(p.estado)
      if (estado === "aprobado") ventas += Number(p.total)
      if (estado === "pendiente") pend++
    })

    setTotalVentas(ventas)
    setPendientes(pend)

    const { data: com } = await supabase
      .from("comisiones")
      .select("monto")

    let totalC = 0
    com?.forEach(c => totalC += Number(c.monto))
    setTotalComisiones(totalC)

    const { data: users } = await supabase
      .from("users")
      .select("activo_comisiones")

    const activos = users?.filter(u => u.activo_comisiones).length
    setUsuariosActivos(activos)
  }

  // 🔥 AQUÍ TRAEMOS TAMBIÉN EL CÓDIGO
  async function getPedidos() {
    const { data, error } = await supabase
      .from("pedidos")
      .select(`
        *,
        users:users!fk_pedidos_user (
          codigo,
          nombre,
          apellidos
        )
      `)
      .order("created_at", { ascending: false })
      .limit(5)

    if (error) {
      console.error("Error pedidos:", error)
      return
    }

    setPedidos(data || [])
  }

  async function getComisiones() {
    const { data, error } = await supabase
      .from("comisiones")
      .select(`
        *,
        users:users!fk_comisiones_user (
          codigo,
          nombre,
          apellidos
        )
      `)
      .order("created_at", { ascending: false })
      .limit(5)

    if (error) {
      console.error("Error comisiones:", error?.message, error)
      return
    }

    setComisiones(data || [])
  }

  if (!userData) return <p style={{ padding: 20 }}>Cargando...</p>

  return (
    <div style={styles.container}>
      <main style={styles.main}>
        <h1 style={styles.title}>👑 Dashboard Administrador</h1>

        <div style={styles.grid}>
          <div style={styles.card}>
            <p>Total Ventas</p>
            <h2>S/ {totalVentas.toFixed(2)}</h2>
          </div>

          <div style={styles.card}>
            <p>Total Comisiones</p>
            <h2>S/ {totalComisiones.toFixed(2)}</h2>
          </div>

          <div style={styles.card}>
            <p>Pedidos Pendientes</p>
            <h2>{pendientes}</h2>
          </div>

          <div style={styles.card}>
            <p>Usuarios Activos</p>
            <h2>{usuariosActivos}</h2>
          </div>
        </div>

        {/* 🔥 PEDIDOS */}
        <div style={styles.section}>
          <h3>📦 Últimos Pedidos</h3>

          <div style={styles.tableHeaderPedidos}>
            <span>N°</span>
            <span>Código</span>
            <span>Usuario</span>
            <span>Estado</span>
            <span>Total</span>
            <span>Acción</span>
          </div>

          {pedidos.map((p, index) => {
            const estado = getEstado(p.estado)
            const user = p.users

            const nombre =
              user?.nombre && user?.apellidos
                ? `${user.nombre} ${user.apellidos}`
                : "SIN NOMBRE"

            return (
              <div key={p.id} style={styles.tableRowPedidos}>
                <span>{index + 1}</span>
                <span>{user?.codigo || "SIN-CODIGO"}</span>
                <span>{nombre}</span>

                <span style={{
                  color: getColor(p.estado),
                  fontWeight: "bold"
                }}>
                  {getLabel(p.estado)}
                </span>

                <span>S/ {Number(p.total || 0).toFixed(2)}</span>

                <span>
                  {estado === "pendiente" && (
                    <button
                      style={styles.btn}
                      onClick={() => aprobarPedido(p.id)}
                    >
                      ✅ Aprobar
                    </button>
                  )}
                </span>
              </div>
            )
          })}
        </div>

        {/* COMISIONES */}
        <div style={styles.section}>
          <h3>💰 Últimas Comisiones</h3>

          <div style={styles.tableHeaderCom}>
            <span>N°</span>
            <span>Código</span>
            <span>Nombres</span>
            <span>Tipo</span>
            <span>Nivel</span>
            <span>Monto</span>
          </div>

          {comisiones.map((c, index) => {
            const user = c.users

            const nombreCompleto =
              user?.nombre && user?.apellidos
                ? `${user.nombre} ${user.apellidos}`
                : "SIN NOMBRE"

            return (
              <div key={c.id} style={styles.tableRowCom}>
                <span>{index + 1}</span>
                <span>{user?.codigo || "SIN-CODIGO"}</span>
                <span>{nombreCompleto}</span>

                <span style={{
                  fontWeight: "bold",
                  color: c.nivel === 0 ? "#2563eb" : "#f59e0b"
                }}>
                  {c.nivel === 0 ? "Propia" : "Red"}
                </span>

                <span>
                  {c.nivel === 0 ? "Nivel 0" : `Nivel ${c.nivel}`}
                </span>

                <span style={{ color: "#16a34a", fontWeight: "bold" }}>
                  S/ {Number(c.monto || 0).toFixed(2)}
                </span>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}

/* 🎨 ESTILOS */
const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    background: "#f3f4f6"
  },
  main: {
    flex: 1,
    padding: 20
  },
  title: {
    marginBottom: 20
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
    marginBottom: 20
  },
  card: {
    background: "white",
    padding: 20,
    borderRadius: 10
  },
  section: {
    background: "white",
    padding: 20,
    borderRadius: 10,
    marginBottom: 20
  },

  tableHeaderPedidos: {
    display: "grid",
    gridTemplateColumns: "0.5fr 1fr 2fr 1fr 1fr 1fr",
    fontWeight: "bold",
    borderBottom: "2px solid #ddd",
    padding: "10px 0"
  },
  tableRowPedidos: {
    display: "grid",
    gridTemplateColumns: "0.5fr 1fr 2fr 1fr 1fr 1fr",
    padding: "10px 0",
    borderBottom: "1px solid #eee"
  },

  tableHeaderCom: {
    display: "grid",
    gridTemplateColumns: "0.5fr 1fr 2fr 1fr 1fr 1fr",
    fontWeight: "bold",
    borderBottom: "2px solid #ddd",
    padding: "10px 0"
  },
  tableRowCom: {
    display: "grid",
    gridTemplateColumns: "0.5fr 1fr 2fr 1fr 1fr 1fr",
    padding: "10px 0",
    borderBottom: "1px solid #eee"
  },

  btn: {
    background: "#16a34a",
    color: "white",
    border: "none",
    padding: "6px 10px",
    borderRadius: 6,
    cursor: "pointer"
  }
}