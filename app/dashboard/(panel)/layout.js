import Sidebar from '../../components/Sidebar'

export default function Layout({ children }) {
  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, padding: 20, width: '100%' }}>
        {children}
      </main>
    </div>
  )
}