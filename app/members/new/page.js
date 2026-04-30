// Server Component — no data fetching needed here anymore.
// clientId is read from ClientContext inside NewMemberForm directly,
// so there is no longer a need to query the database here.
import NewMemberForm from '../../components/NewMemberForm'

export default function NewMemberPage() {
  return <NewMemberForm />
}
