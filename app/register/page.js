import dynamic from 'next/dynamic'

// 🔥 esto desactiva SSR completamente
const RegisterClient = dynamic(() => import('./RegisterClient'), {
  ssr: false
})

export default function Page() {
  return <RegisterClient />
}