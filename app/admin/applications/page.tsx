import { getApplications } from "@/app/actions/admin"
import { getSession } from "@/lib/session"
import { isPaymentConfirmed } from "@/lib/rbac"
import { ApplicationsManager } from "@/components/admin/applications-manager"
import { parseApplicationFilter } from "@/lib/application-filters"

export default async function AdminApplicationsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const [{ filter }, rows, session] = await Promise.all([searchParams, getApplications(), getSession()])
  const role = session?.user?.role ?? "staff"
  const initialFilter = parseApplicationFilter(filter)
  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">Membership Applications</h1>
      <p className="mt-1 text-muted-2">Review and process applications to join VAAP.</p>
      <ApplicationsManager
        key={initialFilter}
        isAdmin={role === "admin"}
        role={role}
        initialFilter={initialFilter}
        items={rows.map((r) => ({
          id: r.id,
          reference: r.reference,
          name: r.name,
          email: r.email,
          organization: r.organization,
          category: r.category,
          message: r.message,
          phone: r.phone,
          cnic: r.cnic,
          registrationNumber: r.registrationNumber,
          website: r.website,
          industrySector: r.industrySector,
          designation: r.designation,
          paymentMethod: r.paymentMethod,
          txid: r.txid,
          cryptoCoin: r.cryptoCoin,
          cryptoAddress: r.cryptoAddress,
          admissionFee: r.admissionFee,
          annualFee: r.annualFee,
          totalAmount: r.totalAmount,
          status: r.status as "pending" | "approved" | "rejected",
          completed: r.completed,
          paymentConfirmed: isPaymentConfirmed(r),
          archived: Boolean(r.archivedAt),
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
