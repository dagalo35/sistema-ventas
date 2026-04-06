'use client'

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default function Comisiones() {
  const [comisiones, setComisiones] = useState([])
  const [userData, setUserData] = useState(null)
  const [usersMap, setUsersMap] = useState({})

  const [total, setTotal] = useState(0)
  const [propia, setPropia] = useState(0)
  const [nivel1, setNivel1] = useState(0)
  const [nivel2, setNivel2] = useState(0)
  const [nivel3, setNivel3] = useState(0)

  const router = useRouter()

  useEffect(() => {
    getData()
  }, [])

  async function getData() {
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

    setUserData(user)

    const { data: users } = await supabase
      .from("users")
      .select("supabase_id, nombre, apellidos, codigo")

    const map = {}
    users?.forEach(u => {
      map[u.supabase_id] = u
    })
    setUsersMap(map)

    let query = supabase
      .from("comisiones")
      .select("*")
      .order("created_at", { ascending: false })

    if (user.role !== "admin") {
      query = query.eq("user_id", user.supabase_id)
    }

    const { data } = await query

    const lista = data || []
    setComisiones(lista)

    let t = 0
    let p = 0
    let n1 = 0
    let n2 = 0
    let n3 = 0

    lista.forEach(c => {
      const monto = Number(c.monto || 0)
      t += monto

      if (c.nivel === 0) p += monto
      if (c.nivel === 1) n1 += monto
      if (c.nivel === 2) n2 += monto
      if (c.nivel === 3) n3 += monto
    })

    setTotal(t)
    setPropia(p)
    setNivel1(n1)
    setNivel2(n2)
    setNivel3(n3)
  }

  function getUserLabel(user_id) {
    const u = usersMap[user_id]

    if (!u) return "Sin datos"

    if (u.nombre) {
      return `${u.nombre} ${u.apellidos || ''}`
    }

    return u.codigo || "Sin código"
  }

  return (
    <div style={styles.container}>
      <main style={styles.main}>

        <h1 style={styles.title}>
          💰 {userData?.role === "admin"
            ? "Panel de Comisiones (Admin)"
            : "Mis Comisiones"}
        </h1>

        {/* TOTAL */}
        <div style={styles.cardTotal}>
          <h2>Total</h2>
          <p style={styles.total}>S/ {total.toFixed(2)}</p>
        </div>

        {/* RESUMEN */}
        <div style={styles.grid}>
          <div style={styles.box}>
            <p>Propias</p>
            <strong>S/ {propia.toFixed(2)}</strong>
          </div>

          <div style={styles.box}>
            <p>Nivel 1</p>
            <strong>S/ {nivel1.toFixed(2)}</strong>
          </div>

          <div style={styles.box}>
            <p>Nivel 2</p>
            <strong>S/ {nivel2.toFixed(2)}</strong>
          </div>

          <div style={styles.box}>
            <p>Nivel 3</p>
            <strong>S/ {nivel3.toFixed(2)}</strong>
          </div>
        </div>

        {/* 🔥 HISTORIAL EN TABLA */}
        <div style={styles.card}>
          <h3>📊 Historial de Comisiones</h3>

          <div style={styles.tableHeader}>
            <span>N°</span>
            <span>Usuario</span>
            <span>Tipo</span>
            <span>Nivel</span>
            <span>Monto</span>
          </div>

          {comisiones.map((c, index) => (
            <div key={c.id} style={styles.tableRow}>
              <span>{index + 1}</span>

              <span>{getUserLabel(c.from_user)}</span>

              <span style={{ fontWeight: "bold" }}>
                {c.tipo}
              </span>

              <span>
                Nivel {c.nivel}
              </span>

              <span style={{ color: "#16a34a", fontWeight: "bold" }}>
                + S/ {Number(c.monto || 0).toFixed(2)}
              </span>
            </div>
          ))}

          {comisiones.length === 0 && (
            <p style={{ marginTop: 10 }}>No hay comisiones</p>
          )}
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

  cardTotal: {
    background: "white",
    padding: 20,
    borderRadius: 12,
    textAlign: "center",
    marginBottom: 20
  },

  total: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#16a34a"
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 10,
    marginBottom: 20
  },

  box: {
    background: "white",
    padding: 15,
    borderRadius: 10,
    textAlign: "center"
  },

  card: {
    background: "white",
    padding: 20,
    borderRadius: 12
  },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "0.5fr 2fr 1fr 1fr 1fr",
    fontWeight: "bold",
    borderBottom: "2px solid #ddd",
    padding: "10px 0"
  },

  tableRow: {
    display: "grid",
    gridTemplateColumns: "0.5fr 2fr 1fr 1fr 1fr",
    padding: "10px 0",
    borderBottom: "1px solid #eee"
  }
}