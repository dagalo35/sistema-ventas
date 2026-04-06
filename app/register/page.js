"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// 🔥 evita prerender en build (MUY IMPORTANTE)
export const dynamic = "force-dynamic"
export const revalidate = 0

export default function Register() {
  const router = useRouter()
  const searchParams = useSearchParams()

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

  // 🔥 capturar referido correctamente
  useEffect(() => {
    const ref = searchParams.get('ref')

    if (ref) {
      setForm(prev => ({
        ...prev,
        sponsor: ref
      }))
    }
  }, [searchParams])

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
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Crear cuenta</h1>
        <p style={styles.subtitle}>GHC INTERNATIONAL S.A.C.</p>

        <form onSubmit={handleSubmit}>
          <div style={styles.grid}>

            <input placeholder="Nombres"
              style={styles.input}
              onChange={e => setForm({...form, nombre: e.target.value})}
            />

            <input placeholder="Apellidos"
              style={styles.input}
              onChange={e => setForm({...form, apellidos: e.target.value})}
            />

            <input placeholder="Documento"
              style={styles.input}
              onChange={e => setForm({...form, documento: e.target.value})}
            />

            <input placeholder="Celular"
              style={styles.input}
              onChange={e => setForm({...form, celular: e.target.value})}
            />

            <input placeholder="País"
              style={styles.input}
              onChange={e => setForm({...form, pais: e.target.value})}
            />

            <input placeholder="Departamento"
              style={styles.input}
              onChange={e => setForm({...form, departamento: e.target.value})}
            />

            <input placeholder="Provincia"
              style={styles.input}
              onChange={e => setForm({...form, provincia: e.target.value})}
            />

            <input placeholder="Distrito"
              style={styles.input}
              onChange={e => setForm({...form, distrito: e.target.value})}
            />

            <input type="email" placeholder="Correo electrónico"
              style={styles.input}
              onChange={e => setForm({...form, email: e.target.value})}
            />

            <input type="password" placeholder="Contraseña"
              style={styles.input}
              onChange={e => setForm({...form, password: e.target.value})}
            />

          </div>

          <input placeholder="Dirección completa"
            style={styles.inputFull}
            onChange={e => setForm({...form, direccion: e.target.value})}
          />

          <input placeholder="Referencia"
            style={styles.inputFull}
            onChange={e => setForm({...form, referencia: e.target.value})}
          />

          {/* 🔥 sponsor automático */}
          <input
            value={form.sponsor}
            placeholder="Código de patrocinador"
            style={styles.inputFull}
            onChange={e => setForm({...form, sponsor: e.target.value})}
          />

          <button style={styles.button}>
            Registrarse
          </button>

        </form>
      </div>
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