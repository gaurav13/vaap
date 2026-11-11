import { getAiSettings } from "@/lib/ai-assistant/settings"
import { getSpend } from "@/lib/ai-assistant/budget"
import { dateTime } from "@/lib/ai-assistant/format"
import { Section } from "@/components/admin/ai/ui"
import { BudgetMeter } from "@/components/admin/ai/budget-meter"
import { EmergencySwitch, SettingsForm } from "@/components/admin/ai/admin-controls"

export async function SettingsTab() {
  const [{ updatedAt, ...settings }, spend] = await Promise.all([getAiSettings(), getSpend()])

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Emergency shutdown" description="Instantly stops all paid AI requests. Free answers keep working." className="lg:col-span-1">
          <EmergencySwitch on={settings.emergencyShutdown} />
        </Section>
        <Section title="Current spend" className="lg:col-span-2">
          <div className="flex flex-col gap-4">
            <BudgetMeter label="This month" spentMicro={spend.monthMicroUsd} reservedMicro={spend.reservedMicroUsd} limitUsd={settings.monthlyBudgetUsd} />
            <BudgetMeter label="Today" spentMicro={spend.dayMicroUsd} reservedMicro={spend.reservedMicroUsd} limitUsd={settings.dailyBudgetUsd} />
          </div>
        </Section>
      </div>

      <Section title="Budget & model settings" description={updatedAt ? `Last saved ${dateTime(updatedAt.toISOString())}` : "Using defaults."}>
        <SettingsForm initial={settings} />
      </Section>
    </div>
  )
}
