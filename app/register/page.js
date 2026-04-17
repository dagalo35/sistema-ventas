'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast, Toaster } from 'sonner'

export default function Register() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [fromLink, setFromLink] = useState(false)

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

  // 🔥 CAPTURAR REFERIDO DESDE URL (PRO)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const ref = params.get("ref")

      if (ref) {
        setForm(prev => ({
          ...prev,
          sponsor: ref
        }))
        setFromLink(true)
      }
    }
  }, [])

  // 🔥 MANEJO GLOBAL DE INPUTS
  const handleChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // 🔥 SUBMIT
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (loading) return

    // 🔥 VALIDACIÓN BÁSICA
    if (!form.email || !form.password) {
      toast.warning('Completa los campos obligatorios')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      const data = await res.json()

      if (data.message) {
        toast.success(data.message)
        router.push('/login')
      } else {
        toast.error(data.error || 'Error al registrar')
      }

    } catch (err) {
      toast.error('Error de conexión en el servidor')
    }

    setLoading(false)
  }

  return (
    <div style={styles.container}>
      <Toaster richColors position="top-right" />
      <div style={styles.card}>
        <h1 style={styles.title}>Crear cuenta</h1>
        <p style={styles.subtitle}>GHC INTERNATIONAL S.A.C.</p>

        <form onSubmit={handleSubmit}>
          <div style={styles.grid}>
            <div>
              <label htmlFor="nombre" style={styles.label}>Nombres</label>
              <input id="nombre" placeholder="Nombres"
              value={form.nombre}
              style={styles.input}
              onChange={e => handleChange('nombre', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="apellidos" style={styles.label}>Apellidos</label>
              <input id="apellidos" placeholder="Apellidos"
              value={form.apellidos}
              style={styles.input}
              onChange={e => handleChange('apellidos', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="documento" style={styles.label}>Documento</label>
              <input id="documento" placeholder="Documento"
              value={form.documento}
              style={styles.input}
              onChange={e => handleChange('documento', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="celular" style={styles.label}>Celular</label>
              <input id="celular" placeholder="Celular"
              value={form.celular}
              style={styles.input}
              onChange={e => handleChange('celular', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="pais" style={styles.label}>País</label>
              <input id="pais" placeholder="País"
              value={form.pais}
              style={styles.input}
              onChange={e => handleChange('pais', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="departamento" style={styles.label}>Departamento</label>
              <input id="departamento" placeholder="Departamento"
              value={form.departamento}
              style={styles.input}
              onChange={e => handleChange('departamento', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="provincia" style={styles.label}>Provincia</label>
              <input id="provincia" placeholder="Provincia"
                value={form.provincia}
                style={styles.input}
                onChange={e => handleChange('provincia', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="distrito" style={styles.label}>Distrito</label>
              <input id="distrito" placeholder="Distrito"
                value={form.distrito}
                style={styles.input}
                onChange={e => handleChange('distrito', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="email" style={styles.label}>Correo electrónico</label>
              <input id="email" type="email" placeholder="Correo electrónico"
                value={form.email}
                style={styles.input}
                onChange={e => handleChange('email', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" style={styles.label}>Contraseña</label>
              <input id="password" type="password" placeholder="Contraseña"
                value={form.password}
                style={styles.input}
                onChange={e => handleChange('password', e.target.value)}
              />
            </div>

          </div>

          <label htmlFor="direccion" style={styles.label}>Dirección completa</label>
          <input id="direccion" placeholder="Dirección completa"
            value={form.direccion}
            style={styles.inputFull}
            onChange={e => handleChange('direccion', e.target.value)}
          />

          <label htmlFor="referencia" style={styles.label}>Referencia</label>
          <input id="referencia" placeholder="Referencia"
            value={form.referencia}
            style={styles.inputFull}
            onChange={e => handleChange('referencia', e.target.value)}
          />

          {/* 🔥 CAMPO REFERIDO */}
          <label htmlFor="sponsor" style={styles.label}>Código de patrocinador</label>
          <input
            id="sponsor"
            value={form.sponsor}
            placeholder="Código de patrocinador"
            style={{
              ...styles.inputFull,
              background: fromLink ? '#f3f4f6' : 'white'
            }}
            onChange={e => handleChange('sponsor', e.target.value)}
            readOnly={fromLink} // 🔥 bloquea si viene por link
          />

          <button style={styles.button} disabled={loading}>
            {loading ? 'Registrando...' : 'Registrarse'}
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

  label: {
    display: 'block',
    fontSize: '11px',
    color: '#6b7280',
    marginBottom: '2px',
    marginLeft: '5px'
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