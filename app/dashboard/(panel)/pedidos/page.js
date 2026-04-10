'use client'

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Pedidos() {
  const router = useRouter()

  const [carrito, setCarrito] = useState({})
  const [total, setTotal] = useState(0)
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(false)

  const lista = [
    { nombre: 'MAGVIT17', precio: 50, imagen: '/img/magvit17.jpg' },
    { nombre: 'COLLAGEM', precio: 70, imagen: '/img/collagem.jpg' }
  ]

  useEffect(() => {
    getPedidos()
  }, [])

  useEffect(() => {
    calcularTotal()
  }, [carrito])

  // =========================
  // 🔹 OBTENER PEDIDOS
  // =========================
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
      // 🔥 ordenar por fecha DESC (más reciente arriba)
      const filtrados = data
        .filter(p => p.estado !== "cancelado")
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      setPedidos(filtrados)
    }
  }

  // =========================
  // 🔹 CARRITO
  // =========================
  function agregar(prod) {
    if (loading) return

    setCarrito(prev => ({
      ...prev,
      [prod.nombre]: (prev[prod.nombre] || 0) + 1
    }))
  }

  function quitar(prod) {
    if (loading) return

    setCarrito(prev => {
      const nuevaCantidad = (prev[prod.nombre] || 0) - 1

      if (nuevaCantidad <= 0) {
        const nuevo = { ...prev }
        delete nuevo[prod.nombre]
        return nuevo
      }

      return {
        ...prev,
        [prod.nombre]: nuevaCantidad
      }
    })
  }

  function calcularTotal() {
    let suma = 0

    Object.keys(carrito).forEach(nombre => {
      const prod = lista.find(p => p.nombre === nombre)
      if (prod) {
        suma += prod.precio * carrito[nombre]
      }
    })

    setTotal(suma)
  }

  // =========================
  // 🔹 CREAR PEDIDO
  // =========================
  async function crearPedido() {
    const productosArray = []

    Object.keys(carrito).forEach(nombre => {
      const cantidad = carrito[nombre]

      for (let i = 0; i < cantidad; i++) {
        productosArray.push(nombre)
      }
    })

    if (productosArray.length === 0) {
      alert("Selecciona productos")
      return
    }

    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()

    const res = await fetch('/api/pedidos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        productos: productosArray,
        total
      })
    })

    const data = await res.json()

    if (data.error) {
      alert(data.error)
    } else {
      alert("Pedido creado ✅")
      setCarrito({})
      setTotal(0)
      getPedidos()
    }

    setLoading(false)
  }

  // =========================
  // 🔥 CANCELAR PEDIDO
  // =========================
  async function cancelarPedido(id) {
    const confirmar = confirm("¿Cancelar este pedido?")
    if (!confirmar) return

    const { data: { session } } = await supabase.auth.getSession()

    const res = await fetch('/api/pedidos', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ pedido_id: id })
    })

    const data = await res.json()
    alert(data.message || data.error)

    getPedidos()
  }

  // =========================
  // 🔹 AGRUPAR PRODUCTOS
  // =========================
  function agruparProductos(productosArray) {
    const conteo = {}

    productosArray?.forEach(p => {
      conteo[p] = (conteo[p] || 0) + 1
    })

    return conteo
  }

  const getEstadoColor = (estado) => {
    const e = estado?.toLowerCase()
    if (e === "aprobado") return "#16a34a"
    if (e === "pendiente") return "#f59e0b"
    if (e === "rechazado") return "#dc2626"
    return "#6b7280"
  }

  // =========================
  // 🔥 UI
  // =========================
  return (
    <div style={{ display: "flex", background: '#f3f4f6' }}>
      <div style={styles.container}>

        <h1 style={styles.title}>🛒 Realizar Pedido</h1>

        {/* PRODUCTOS */}
        <div style={styles.productBox}>
          {lista.map((p) => {
            const cantidad = carrito[p.nombre] || 0

            return (
              <div key={p.nombre} style={styles.productCard}>
                <img
                  src={p.imagen}
                  style={styles.img}
                  onError={(e) => e.target.src = '/img/default.png'}
                />

                <h4>{p.nombre}</h4>
                <p>S/ {p.precio}</p>

                <div style={styles.controls}>
                  <button onClick={() => quitar(p)} style={styles.qtyBtn}>➖</button>
                  <span style={styles.qty}>{cantidad}</span>
                  <button onClick={() => agregar(p)} style={styles.qtyBtn}>➕</button>
                </div>
              </div>
            )
          })}
        </div>

        <h2 style={styles.total}>Total: S/ {total}</h2>

        <button
          style={styles.btn}
          onClick={crearPedido}
          disabled={loading}
        >
          {loading ? "Procesando..." : "Crear Pedido"}
        </button>

        {/* 🔥 TABLA LIMPIA */}
        <div style={styles.tableBox}>
          <h2>📦 Mis Pedidos</h2>

          <div style={styles.tableHeader}>
            <span>N°</span>
            <span>Productos</span>
            <span>Estado</span>
            <span>Total</span>
            <span>Fecha</span>
            <span>Acción</span>
          </div>

          {pedidos.map((p, i) => {
            const productosTexto = Object.entries(agruparProductos(p.productos))
              .map(([prod, cant]) => `${prod} x${cant}`)
              .join(", ")

            return (
              <div key={p.id} style={styles.tableRow}>
                <span>{i + 1}</span>

                <span>{productosTexto}</span>

                <span style={{
                  color: getEstadoColor(p.estado),
                  fontWeight: "bold"
                }}>
                  {p.estado}
                </span>

                <span>S/ {Number(p.total).toFixed(2)}</span>

                <span>{new Date(p.created_at).toLocaleString()}</span>

                <span>
                  {p.estado === "pendiente" && (
                    <button
                      style={styles.cancelBtn}
                      onClick={() => cancelarPedido(p.id)}
                    >
                      ❌ Cancelar
                    </button>
                  )}
                </span>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}

// 🎨 ESTILOS
const styles = {
  container: { flex: 1, padding: 30 },

  title: { marginBottom: 20, color: '#065f46' },

  productBox: {
    display: 'flex',
    gap: 25,
    background: 'white',
    padding: 25,
    borderRadius: 15,
    marginBottom: 20
  },

  productCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    width: 180,
    padding: 15
  },

  img: {
    width: 120,
    height: 120,
    borderRadius: 12,
    objectFit: 'cover'
  },

  controls: {
    display: 'flex',
    gap: 10,
    alignItems: 'center'
  },

  qtyBtn: { padding: '5px 10px', cursor: 'pointer' },

  qty: { fontWeight: 'bold' },

  total: { marginTop: 10 },

  btn: {
    marginBottom: 20,
    padding: 12,
    background: '#16a34a',
    color: 'white',
    border: 'none',
    borderRadius: 10
  },

  tableBox: {
    background: 'white',
    padding: 20,
    borderRadius: 15
  },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "0.5fr 2fr 1fr 1fr 2fr 1fr",
    fontWeight: "bold",
    borderBottom: "2px solid #ddd",
    padding: "10px 0"
  },

  tableRow: {
    display: "grid",
    gridTemplateColumns: "0.5fr 2fr 1fr 1fr 2fr 1fr",
    padding: "10px 0",
    borderBottom: "1px solid #eee"
  },

  cancelBtn: {
    background: "#dc2626",
    color: "white",
    border: "none",
    padding: "6px 10px",
    borderRadius: 6,
    cursor: "pointer"
  }
}