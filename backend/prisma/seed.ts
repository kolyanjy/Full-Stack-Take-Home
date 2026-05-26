import 'dotenv/config';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  const sites = [
    {
      name: 'Permian Basin Well Pad A',
      location: 'Midland, TX',
      emission_limit: 5000,
      total_emissions_to_date: 1250.75,
      metadata: { operator: 'Highwood Energy', type: 'well_pad', sensors: 4 },
    },
    {
      name: 'Eagle Ford Compressor Station',
      location: 'San Antonio, TX',
      emission_limit: 8000,
      total_emissions_to_date: 9100.5,
      metadata: { operator: 'Highwood Energy', type: 'compressor', sensors: 6 },
    },
    {
      name: 'Marcellus Shale Gathering Facility',
      location: 'Pittsburgh, PA',
      emission_limit: 3000,
      total_emissions_to_date: 850.0,
      metadata: { operator: 'Highwood Energy', type: 'gathering', sensors: 2 },
    },
  ];

  for (const site of sites) {
    await prisma.site.create({
      data: {
        id: randomUUID(),
        ...site,
      },
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
