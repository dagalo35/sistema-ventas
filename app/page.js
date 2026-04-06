'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Home() {
  const router = useRouter()

  const [pedidos, setPedidos] = useState([])
  const [total, setTotal] = useState('')
  const [loading, setLoading] = useState(true)

  // 🔐 PROTEGER RUTA
  useEffect(() => {
    const token = localStorage.getItem('token')

    if (!token) {
      router.push('/login')
      return
    }

    fetchData()
  }, [])

  // 📦 CARGAR PEDIDOS (DESDE API)
  const fetchData = async () => {
    setLoading(true)

    const token = localStorage.getItem('token')

    try {
      const res = await fetch('/api/pedidos', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const data = await res.json()

      if (res.status !== 200) {
        alert(data.error || 'Error al cargar pedidos')
        return
      }

      setPedidos(data)
    } catch (err) {
      console.error(err)
      alert('Error de conexión')
    }

    setLoading(false)
  }

  // ➕ CREAR PEDIDO
  const crearPedido = async () => {
    if (!total) {
      alert('Falta el total')
      return
    }

    const token = localStorage.getItem('token')

    try {
      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          total: parseFloat(total)
        })
      })

      const data = await res.json()

      if (res.status !== 200) {
        alert(data.error || 'Error al crear pedido')
        return
      }

      setTotal('')
      fetchData()
    } catch (err) {
      console.error(err)
      alert('Error de conexión')
    }
  }

  // 🚪 LOGOUT
  const logout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  if (loading) return <p style={{ padding: 20 }}>Cargando...</p>

  return (
    <div style={{ padding: 20 }}>
      {/* 🔗 NAVEGACIÓN */}
      <div style={{ marginBottom: 20 }}>
        <Link href="/login">
          <button>Login</button>
        </Link>

        <Link href="/register">
          <button>Registro</button>
        </Link>

        <button onClick={logout}>Cerrar sesión</button>
      </div>

      <h1>Sistema de Pedidos</h1>

      {/* CREAR PEDIDO */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="number"
          placeholder="Total"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
        />

        <button onClick={crearPedido}>Crear Pedido</button>
      </div>

      {/* TABLA */}
      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>Total</th>
            <th>Estado</th>
          </tr>
        </thead>

        <tbody>
          {pedidos.length === 0 ? (
            <tr>
              <td colSpan="2">No hay pedidos</td>
            </tr>
          ) : (
            pedidos.map((pedido) => (
              <tr key={pedido.id}>
                <td>${pedido.total}</td>
                <td>{pedido.estado}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}