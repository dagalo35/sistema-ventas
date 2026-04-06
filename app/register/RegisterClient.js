"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RegisterClient() {
  const router = useRouter()

  const [form, setForm] = useState({
    nombre: '',
    apellidos: '',
    documento: '',
    direccion: '',
    referencia: '',
    pais: '',
    departamento: '',
    provincia: '',
    distrito: '',
    email: '',
    celular: '',
    password: '',
    sponsor: ''
  })

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const ref = params.get("ref")

      if (ref) {
        setForm(prev => ({
          ...prev,
          sponsor: ref
        }))
      }
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })

    const data = await res.json()

    if (data.message) {
      alert(data.message)
      router.push('/login')
    } else {
      alert(data.error)
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Registro</h1>

      <form onSubmit={handleSubmit}>
        <input placeholder="Nombre"
          onChange={e => setForm({...form, nombre: e.target.value})}
        />

        <input placeholder="Email"
          onChange={e => setForm({...form, email: e.target.value})}
        />

        <input placeholder="Contraseña" type="password"
          onChange={e => setForm({...form, password: e.target.value})}
        />

        <button>Registrarse</button>
      </form>
    </div>
  )
}
/* 🎨 ESTILOS */
const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #e5e7eb, #d1fae5)',
    padding: 20
  },

  card: {
    background: '#ffffff',
    padding: 30,
    borderRadius: 20,
    width: '100%',
    maxWidth: 700,
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
  },

  title: {
    fontSize: 24,
    marginBottom: 5,
    textAlign: 'center'
  },

  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 20,
    textAlign: 'center'
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10
  },

  input: {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    border: '1px solid #e5e7eb'
  },

  inputFull: {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    marginTop: 10
  },

  button: {
    width: '100%',
    padding: 12,
    border: 'none',
    borderRadius: 10,
    background: '#16a34a',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: 15
  }
}