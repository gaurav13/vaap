import { getStaffTeam } from "@/app/actions/admin-staff"
import { StaffManager } from "@/components/admin/staff-manager"

export default async function AdminStaffPage() {
  const { team, committees } = await getStaffTeam()
  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-heading">Team &amp; Staff</h1>
      <p className="mt-1 text-muted-2">
        Manage staff and committee member profiles &mdash; their VAAP position, committee, contact details, and the
        referral rewards they have earned.
      </p>
      <StaffManager team={team} committees={committees} />
    </div>
  )
}
