import { getApplications } from "@/app/actions/admin"
import { ApplicationsManager } from "@/components/admin/applications-manager"

export default async function AdminApplicationsPage() {
  const rows = await getApplications()
  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">Membership Applications</h1>
      <p className="mt-1 text-muted-2">Review and process applications to join VAAP.</p>
      <ApplicationsManager
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
          admissionFee: r.admissionFee,
          annualFee: r.annualFee,
          totalAmount: r.totalAmount,
          status: r.status as "pending" | "approved" | "rejected",
          completed: r.completed,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
