'use client'

import { useRouter } from 'next/navigation'

export default function Sidebar() {
  const router = useRouter()

  return (
    <div style={styles.sidebar}>

      <h2 style={styles.logo}>GHC INTERNATIONAL S.A.C.</h2>

      <button onClick={() => router.push('/dashboard')} style={styles.link}>
        🏠 Dashboard
      </button>

      <button onClick={() => router.push('/dashboard/pedidos')} style={styles.link}>
        📦 Mis Pedidos
      </button>

      <button onClick={() => router.push('/dashboard/comisiones')} style={styles.link}>
        💰 Mis Comisiones
      </button>

      <button onClick={() => router.push('/dashboard/red')} style={styles.link}>
        🌐 Mi Red
      </button>
      
      <button onClick={() => router.push('/dashboard/ayuda')} style={styles.link}>
       🎧 Centro de Ayuda
      </button>
    </div>
  )
}

const styles = {
  sidebar: {
    width: 220,
    height: '100vh',
    background: '#166534',
    color: 'white',
    padding: 20,
    position: 'fixed',
    left: 0,
    top: 0
  },
  logo: {
    marginBottom: 30
  },
  link: {
    display: 'block',
    width: '100%',
    marginBottom: 10,
    padding: 10,
    background: 'transparent',
    border: 'none',
    color: 'white',
    textAlign: 'left',
    cursor: 'pointer',
    borderRadius: 6
  }
}