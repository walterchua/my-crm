const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create demo client
  const client = await prisma.client.create({
    data: {
      name: 'Demo Coffee Shop'
    }
  })
  console.log('Created client:', client.name)

  // Create client config — configuration-first design
  await prisma.clientConfig.create({
    data: {
      clientId: client.id,
      earnRate: 2.0,
      tierSilver: 300,
      tierGold: 1000,
      tierPlatinum: 3000,
      expiryDays: 365,
      pointsToRedeem: 200
    }
  })
  console.log('Created config for:', client.name)

  // Create demo members — scoped to this client
  const walter = await prisma.member.create({
    data: {
      clientId: client.id,
      name: 'Walter Yu',
      email: 'walter@demo.com',
      points: 1250,
      tier: 'Gold'
    }
  })
  console.log('Created member:', walter.name)

  const john = await prisma.member.create({
    data: {
      clientId: client.id,
      name: 'John Tan',
      email: 'john@demo.com',
      points: 320,
      tier: 'Silver'
    }
  })
  console.log('Created member:', john.name)

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })