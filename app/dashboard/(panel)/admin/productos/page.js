'use client'

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { toast, Toaster } from "sonner"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function AdminProductos() {
  const [productos, setProductos] = useState([])
  const [nombre, setNombre] = useState("")
  const [precio, setPrecio] = useState("")
  const [imagen, setImagen] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchProductos()
  }, [])

  async function fetchProductos() {
    const res = await fetch('/api/productos')
    const data = await res.json()
    if (!data.error) setProductos(data)
  }

  async function handleAdd(e) {
    e.preventDefault()
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()

    const res = await fetch('/api/productos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ nombre, precio, imagen })
    })

    if (res.ok) {
      toast.success("Producto agregado correctamente ✅")
      setNombre(""); setPrecio(""); setImagen("")
      fetchProductos()
    } else {
      const err = await res.json()
      toast.error(err.error || "Error al agregar producto ❌")
    }
    setLoading(false)
  }

  async function deleteProducto(id) {
    if(!confirm("¿Estás seguro de eliminar este producto?")) return
    
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/productos?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` }
    })

    if (res.ok) {
      toast.success("Producto eliminado ✅")
      fetchProductos()
    } else {
      toast.error("No se pudo eliminar el producto ❌")
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <Toaster richColors position="top-right" />
      <h1>📦 Gestión de Productos (Admin)</h1>

      <form onSubmit={handleAdd} style={styles.form}>
        <div style={styles.group}>
          <label style={styles.label}>Nombre del Producto</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} required style={styles.input} placeholder="Ej: MAGVIT17" />
        </div>
        <div style={styles.group}>
          <label style={styles.label}>Precio (S/)</label>
          <input type="number" step="0.01" value={precio} onChange={e => setPrecio(e.target.value)} required style={styles.input} placeholder="0.00" />
        </div>
        <div style={styles.group}>
          <label style={styles.label}>URL de la Imagen</label>
          <input value={imagen} onChange={e => setImagen(e.target.value)} required style={styles.input} placeholder="/img/producto.jpg" />
        </div>
        <button type="submit" disabled={loading} style={styles.btn}>
          {loading ? "Procesando..." : "➕ Agregar Producto"}
        </button>
      </form>

      <div style={{ marginTop: 40 }}>
        <h3>Productos Actuales</h3>
        <div style={styles.grid}>
          {productos.map(p => (
            <div key={p.id} style={styles.card}>
              <img src={p.imagen} alt={p.nombre} style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: 8 }} />
              <p style={{ margin: '10px 0 5px', fontWeight: 'bold' }}>{p.nombre}</p>
              <p style={{ margin: '0 0 10px', color: '#16a34a', fontWeight: 'bold' }}>S/ {p.precio}</p>
              <button 
                onClick={() => deleteProducto(p.id)}
                style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '5px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles = {
  form: { background: "white", padding: 20, borderRadius: 12, maxWidth: 450, display: "flex", flexDirection: "column", gap: 15, boxShadow: "0 2px 10px rgba(0,0,0,0.05)" },
  group: { display: "flex", flexDirection: "column", gap: 5 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#4b5563' },
  input: { padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", outline: 'none' },
  btn: { padding: 12, background: "#16a34a", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 'bold' },
  grid: { display: "flex", gap: 20, flexWrap: "wrap" },
  card: { background: "white", padding: 15, borderRadius: 12, textAlign: "center", width: 160, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }
}
