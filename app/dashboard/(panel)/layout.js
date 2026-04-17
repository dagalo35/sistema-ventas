import Sidebar from '../../components/Sidebar'

export default function Layout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* SIDEBAR */}
      <div style={{
        width: 220,
        flexShrink: 0
      }}>
        <Sidebar />
      </div>

      {/* CONTENIDO */}
      <main style={{
        flex: 1,
        padding: 30,
        background: '#f3f4f6'
      }}>
        {children}
      </main>

    </div>
  )
}