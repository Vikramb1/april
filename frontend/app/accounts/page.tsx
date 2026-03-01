'use client'

import { TopNav } from '@/components/layout/TopNav'

const INSTITUTIONS = [
  { name: 'Chase', lastSynced: 'Jan 15', connected: true },
  { name: 'Fidelity', lastSynced: 'Jan 12', connected: true },
  { name: 'Robinhood', lastSynced: 'Dec 28', connected: false },
  { name: 'Bank of America', lastSynced: 'Jan 10', connected: true },
  { name: 'Vanguard', lastSynced: 'Jan 5', connected: true },
]

export default function AccountsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-cream">
      <TopNav />
      <main className="pt-14 max-w-3xl mx-auto w-full px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[24px] font-extrabold text-ink">Connected Accounts</h1>
          <p className="text-[13px] text-muted">{INSTITUTIONS.filter(i => i.connected).length} accounts connected</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {INSTITUTIONS.map((inst) => (
            <div
              key={inst.name}
              className="bg-white border border-hairline rounded-xl h-20 flex flex-col items-center justify-center relative cursor-pointer hover:border-green transition-colors"
            >
              <span className="text-[14px] font-semibold text-ink">{inst.name}</span>
              <span className="font-mono text-[11px] text-muted mt-1">Last synced {inst.lastSynced}</span>
              <span
                className={`absolute bottom-2 right-2 w-2 h-2 rounded-full ${
                  inst.connected ? 'bg-green' : 'bg-[#E5E7EB]'
                }`}
              />
            </div>
          ))}

          {/* Add account tile */}
          <div className="bg-white border-2 border-dashed border-hairline rounded-xl h-20 flex flex-col items-center justify-center cursor-pointer hover:border-green transition-colors">
            <span className="text-[18px] text-muted mb-1">+</span>
            <span className="text-[13px] text-muted font-medium">Connect Account</span>
          </div>
        </div>
      </main>
    </div>
  )
}
