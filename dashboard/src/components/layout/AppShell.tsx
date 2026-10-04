import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Header />
      <Sidebar />
      <main className="app-main" role="main">
        {children}
      </main>
    </div>
  )
}
