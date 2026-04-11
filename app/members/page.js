// Server Component — fetches data before page loads
export default async function MembersPage() {
    const response = await fetch('http://localhost:3000/api/members', {
      cache: 'no-store'
    })
    const members = await response.json()
  
    return (
      <main className="p-8">
        <h1 className="text-3xl font-bold mb-6">Members</h1>
        <div className="grid gap-4">
          {members.map(member => (
            <div
              key={member.id}
              className="bg-white border rounded-lg p-6 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold">{member.name}</h2>
                  <p className="text-gray-500">{member.email}</p>
                </div>
                <div className="text-right">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {member.tier}
                  </span>
                  <p className="text-2xl font-bold mt-2">{member.points} pts</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    )
  }