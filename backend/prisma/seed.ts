import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const sites = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Permian Basin Well Pad A',
      location: 'Midland, TX',
      emission_limit: 5000,
      total_emissions_to_date: 1250.75,
      metadata: { operator: 'Highwood Energy', type: 'well_pad', sensors: 4 },
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Eagle Ford Compressor Station',
      location: 'San Antonio, TX',
      emission_limit: 8000,
      total_emissions_to_date: 9100.5,
      metadata: { operator: 'Highwood Energy', type: 'compressor', sensors: 6 },
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Marcellus Shale Gathering Facility',
      location: 'Pittsburgh, PA',
      emission_limit: 3000,
      total_emissions_to_date: 850.0,
      metadata: { operator: 'Highwood Energy', type: 'gathering', sensors: 2 },
    },
  ];

  for (const site of sites) {
    await prisma.site.upsert({
      where: { id: site.id },
      update: {},
      create: site,
    });
    console.log(`  Site seeded: ${site.name}`);
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
