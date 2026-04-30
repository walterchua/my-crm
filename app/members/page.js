// Server Component — no data fetching needed here anymore.
// The selected client now lives in ClientContext (populated in the nav).
// MembersList reads it directly from context, so this page just renders it.
import MembersList from '../components/MembersList'

export default function MembersPage() {
  return <MembersList />
}
