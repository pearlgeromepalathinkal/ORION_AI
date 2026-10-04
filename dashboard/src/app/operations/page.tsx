import { AppShell } from '@/components/layout/AppShell'
import { OperationsFloor } from '@/components/operations-floor/OperationsFloor'

export const metadata = {
  title: 'Operations Floor — ORION-AI',
  description: 'Live operations floor showing autonomous incident processing with human-in-the-loop intervention.',
}

export default function OperationsPage() {
  return (
    <AppShell>
      <OperationsFloor />
    </AppShell>
  )
}
