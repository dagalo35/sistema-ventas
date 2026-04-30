'use client'

export default function MantenimientoPage() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>🛠️</div>
        <h1 style={styles.title}>Sitio en Mantenimiento</h1>
        <h2 style={styles.company}>GHC INTERNATIONAL S.A.C.</h2>
        <p style={styles.text}>
          Estamos realizando mejoras en nuestra plataforma para brindarte un mejor servicio. 
          Volveremos a estar en línea muy pronto.
        </p>
        <div style={styles.loader}></div>
        <p style={styles.footer}>Gracias por su paciencia.</p>
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: '#f3f4f6',
    fontFamily: 'Inter, sans-serif',
    padding: '20px'
  },
  card: {
    background: 'white',
    padding: '40px',
    borderRadius: '20px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    textAlign: 'center',
    maxWidth: '500px',
    width: '100%'
  },
  icon: {
    fontSize: '50px',
    marginBottom: '20px'
  },
  title: {
    color: '#1f2937',
    fontSize: '28px',
    fontWeight: 'bold',
    margin: '0 0 10px 0'
  },
  company: {
    color: '#16a34a',
    fontSize: '14px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '20px'
  },
  text: {
    color: '#6b7280',
    lineHeight: '1.6',
    marginBottom: '30px'
  },
  loader: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #16a34a',
    borderRadius: '50%',
    margin: '0 auto 20px'
  },
  footer: {
    fontSize: '12px',
    color: '#9ca3af'
  }
}
