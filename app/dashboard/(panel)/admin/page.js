'use client'

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { toast, Toaster } from "sonner"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function AdminDashboard() {
  const [userData, setUserData] = useState(null)

  const [totalVentas, setTotalVentas] = useState(0)
  const [comisionesGeneradas, setComisionesGeneradas] = useState(0)
  const [totalComisiones, setTotalComisiones] = useState(0)
  const [pendientes, setPendientes] = useState(0)
  const [usuariosActivos, setUsuariosActivos] = useState(0)
  const [retirosPendientes, setRetirosPendientes] = useState(0)

  const [pedidos, setPedidos] = useState([])
  const [comisiones, setComisiones] = useState([])

  const router = useRouter()

  const init = useCallback(async () => {
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
  }, [router])

  useEffect(() => {
    init()
  }, [init])

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
    const confirmar = confirm("⚠️ ¿Confirmas la APROBACIÓN?\n\nEsto activará al usuario y repartirá las comisiones en la red de manera irreversible.")
    if (!confirmar) return

    const { data: { session } } = await supabase.auth.getSession()

    const res = await fetch('/api/pedidos', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
    body: JSON.stringify({ pedido_id: id, estado: 'aprobado' }) // 👈 Corregido a español
    })

    const data = await res.json()
    if (!res.ok) {
    toast.error("Error: " + (data.error || "No se pudo aprobar el pedido"))
    } else {
    toast.success("Pedido aprobado y comisiones repartidas ✅")
      init() // Recarga todos los KPIs y tablas
    }
  }

  async function sincronizarSaldos() {
    const confirmar = confirm("⚠️ ¿Deseas recalcular los saldos de todos los usuarios?\n\nEsto sumará todas las comisiones reales y restará los retiros para corregir discrepancias.")
    if (!confirmar) return

    toast.loading("Sincronizando saldos...")

    try {
      // 1. Obtener todos los usuarios
      const { data: users } = await supabase.from("users").select("supabase_id, role")
      
      for (const user of users) {
        // El administrador no maneja saldo propio generalmente
        if (user.role === 'admin') continue

        // 2. Sumar todas sus comisiones
        const { data: coms } = await supabase
          .from("comisiones")
          .select("monto")
          .eq("user_id", user.supabase_id)

        const totalComisiones = coms?.reduce((acc, c) => acc + parseFloat(c.monto || 0), 0) || 0

        // 3. Sumar todos sus retiros (independientemente del estado, 
        // ya que el saldo se descuenta al solicitar)
        const { data: rets } = await supabase
          .from("retiros")
          .select("monto")
          .eq("user_id", user.supabase_id)

        const totalRetiros = rets?.reduce((acc, r) => acc + parseFloat(r.monto || 0), 0) || 0

        // 4. Calcular saldo real
        const saldoReal = (totalComisiones - totalRetiros).toFixed(2)

        // 5. Actualizar en la tabla users
        await supabase
          .from("users")
          .update({ saldo: saldoReal })
          .eq("supabase_id", user.supabase_id)
      }

      toast.dismiss()
      toast.success("Sincronización completada con éxito ✅")
      init() // Recargar KPIs
    } catch (err) {
      console.error("Error sincronizando:", err)
      toast.dismiss()
      toast.error("Hubo un error durante la sincronización ❌")
    }
  }

  async function getKPIs() {
    const { data: pedidos } = await supabase
      .from("pedidos")
      .select("total, estado, productos")

    let ventas = 0
    let pend = 0
    let generadas = 0

    pedidos?.forEach(p => {
      const estado = getEstado(p.estado)
      if (estado === "aprobado") {
        ventas += Number(p.total)
        // Regla: 20 soles por cada producto en pedidos aprobados
        const numProductos = Array.isArray(p.productos) ? p.productos.length : 0
        generadas += (numProductos * 20)
      }
      if (estado === "pendiente") pend++
    })

    setTotalVentas(ventas)
    setComisionesGeneradas(generadas)
    setPendientes(pend)

    const { data: com } = await supabase
      .from("comisiones")
      .select("monto, users:users!fk_comisiones_user(role)")

    let totalC = 0
    com?.forEach(c => {
      // Solo sumar al "Pago de Comisiones" si el receptor NO es admin
      if (c.users?.role !== 'admin') {
        totalC += Number(c.monto)
      }
    })
    setTotalComisiones(totalC)

    const { data: users } = await supabase
      .from("users")
      .select("activo_comisiones")

    const activos = users?.filter(u => u.activo_comisiones).length
    setUsuariosActivos(activos)

    // 🔥 RETIROS PENDIENTES
    const { count: retCount } = await supabase
      .from("retiros")
      .select("*", { count: 'exact', head: true })
      .eq("estado", "pendiente")
    setRetirosPendientes(retCount || 0)
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
          apellidos,
          role
        )
      `)
      .order("created_at", { ascending: false })
      .limit(5)

    if (error) {
      console.error("Error comisiones:", error?.message, error)
      return
    }

    // Filtrar para no mostrar comisiones de administradores en la tabla
    const filtradas = data?.filter(c => c.users?.role !== 'admin').slice(0, 5) || []
    setComisiones(filtradas)
  }

  if (!userData) return <p style={{ padding: 20 }}>Cargando...</p>

  return (
    <div style={styles.container}>
      <Toaster richColors position="top-right" />
      
      <main style={styles.main}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 10 }}>
          <h1 style={{ margin: 0 }}>👑 Dashboard Administrador</h1>
          <button onClick={sincronizarSaldos} style={styles.btnSync}>
            🔄 Sincronizar Saldos
          </button>
        </div>

        <div style={styles.grid}>
          <div style={styles.card}>
            <p>Total Ventas</p>
            <h2>S/ {totalVentas.toFixed(2)}</h2>
          </div>

          <div style={styles.card}>
            <p>Total Comisiones</p>
            <h2>S/ {comisionesGeneradas.toFixed(2)}</h2>
          </div>

          <div style={styles.card}>
            <p>Pago de Comisiones</p>
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

        <div style={{ display: 'flex', gap: 15, marginBottom: 30 }}>
          <div style={{ 
            ...styles.card, 
            flex: 1, 
            borderTop: '6px solid #f59e0b', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center' 
          }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 'bold', color: '#666' }}>💰 GESTIÓN DE PAGOS</p>
            <h2 style={{ margin: '10px 0' }}>{retirosPendientes} Retiros Pendientes</h2>
            <button onClick={() => router.push("/dashboard/admin/pagos")} style={styles.btnPayments}>
              💳 Procesar Pagos
            </button>
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
    gridTemplateColumns: "repeat(5, 1fr)",
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
  btnSync: {
    background: "#4b5563",
    color: "white",
    border: "none",
    padding: "10px 15px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "13px"
  },
  btnPayments: {
    background: "#7c3aed",
    color: "white",
    border: "none",
    padding: "8px 15px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "13px"
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