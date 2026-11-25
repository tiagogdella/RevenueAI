import 'dotenv/config';
import { faker } from '@faker-js/faker/locale/pt_BR';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Segment } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

faker.seed(42); // same seed = same data on every run (the eval depends on it)

// Fake CNPJ with valid check digits: the XSD doesn't check them, SEFAZ does
function fakeCnpj(): string {
  const base = faker.string.numeric(8) + '0001'; // 0001 = head office
  const checkDigit = (digits: string, weights: number[]) => {
    const sum = weights.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const d1 = checkDigit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = checkDigit(base + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return `${base}${d1}${d2}`;
}

// Products of a rice mill (synthetic data, real NCM codes from the TIPI table)
const products = [
  { code: 'ARZ-T1-1KG', name: 'ARROZ BRANCO TIPO 1 PACOTE 1KG', unit: 'PCT', weightKg: 1, ncm: '10063021', basePrice: 5.9 },
  { code: 'ARZ-T1-5KG', name: 'ARROZ BRANCO TIPO 1 PACOTE 5KG', unit: 'PCT', weightKg: 5, ncm: '10063021', basePrice: 27.5 },
  { code: 'ARZ-T1-FD10', name: 'ARROZ BRANCO TIPO 1 FARDO 10X1KG', unit: 'FD', weightKg: 10, ncm: '10063021', basePrice: 56 },
  { code: 'ARZ-T1-FD30', name: 'ARROZ BRANCO TIPO 1 FARDO 6X5KG', unit: 'FD', weightKg: 30, ncm: '10063021', basePrice: 158 },
  { code: 'ARZ-PB-FD30', name: 'ARROZ PARBOILIZADO TIPO 1 FARDO 6X5KG', unit: 'FD', weightKg: 30, ncm: '10063011', basePrice: 165 },
  { code: 'ARZ-T2-SC25', name: 'ARROZ BRANCO TIPO 2 SACO 25KG', unit: 'SC', weightKg: 25, ncm: '10063021', basePrice: 110 },
  { code: 'ARZ-T1-SC50', name: 'ARROZ BRANCO TIPO 1 SACO 50KG', unit: 'SC', weightKg: 50, ncm: '10063021', basePrice: 235 },
  { code: 'ARZ-T1-SC60', name: 'ARROZ BRANCO TIPO 1 SACO 60KG', unit: 'SC', weightKg: 60, ncm: '10063021', basePrice: 280 },
  { code: 'ARZ-GRANEL', name: 'ARROZ BRANCO TIPO 1 A GRANEL', unit: 'KG', weightKg: 1, ncm: '10063021', basePrice: 4.4 },
  { code: 'QUIRERA-SC50', name: 'ARROZ QUEBRADO (QUIRERA) SACO 50KG', unit: 'SC', weightKg: 50, ncm: '10064000', basePrice: 95 },
  { code: 'FARELO-SC40', name: 'FARELO DE ARROZ SACO 40KG', unit: 'SC', weightKg: 40, ncm: '23024000', basePrice: 48 },
  { code: 'FARELO-GRANEL', name: 'FARELO DE ARROZ A GRANEL', unit: 'KG', weightKg: 1, ncm: '23024000', basePrice: 1.1 },
];

// Customers: two "Zé" on purpose, so the AI has to disambiguate
const customers = [
  { name: 'MERCADO DO ZE LTDA', nickname: 'mercado do Zé', city: 'Pelotas', state: 'RS', cityCode: '4314407', segment: Segment.RETAIL },
  { name: 'ZE CARLOS COMERCIO DE ALIMENTOS LTDA', nickname: 'Zé Carlos', city: 'Porto Alegre', state: 'RS', cityCode: '4314902', segment: Segment.WHOLESALE },
  { name: 'SUPERMERCADO BOA COMPRA LTDA', nickname: 'Boa Compra', city: 'Caxias do Sul', state: 'RS', cityCode: '4305108', segment: Segment.RETAIL },
  { name: 'ATACADAO SUL DISTRIBUIDORA LTDA', nickname: 'Atacadão Sul', city: 'Canoas', state: 'RS', cityCode: '4304606', segment: Segment.WHOLESALE },
  { name: 'RACOES SANTA MARIA LTDA', nickname: 'Rações SM', city: 'Santa Maria', state: 'RS', cityCode: '4316907', segment: Segment.INDUSTRY },
  { name: 'DISTRIBUIDORA LITORAL CATARINENSE LTDA', nickname: 'Litoral', city: 'Florianópolis', state: 'SC', cityCode: '4205407', segment: Segment.WHOLESALE },
  { name: 'EMPORIO CURITIBANO LTDA', nickname: 'Empório', city: 'Curitiba', state: 'PR', cityCode: '4106902', segment: Segment.RETAIL },
  { name: 'CERVEJARIA PAULISTA LTDA', nickname: 'Cervejaria', city: 'São Paulo', state: 'SP', cityCode: '3550308', segment: Segment.INDUSTRY },
];

async function main() {
  // Wipe everything and restart ids at 1, so every run produces the same ids
  await prisma.$executeRaw`TRUNCATE "OrderItem", "Invoice", "Order", "Lot", "Product", "Customer" RESTART IDENTITY CASCADE`;

  for (const c of customers) {
    await prisma.customer.create({ data: { ...c, cnpj: fakeCnpj() } });
  }

  let lotSeq = 0;
  for (const p of products) {
    const product = await prisma.product.create({ data: p });

    for (let i = 1; i <= 3; i++) {
      lotSeq++;
      const isBulk = p.unit === 'KG'; // bulk is counted in kg, so much bigger numbers
      const balance =
        i === 3 ? 0 // third lot is always empty: the system must never pick it
        : isBulk ? faker.number.int({ min: 5000, max: 30000 })
        : faker.number.int({ min: 20, max: 500 });

      await prisma.lot.create({
        data: {
          code: `L2611-${String(lotSeq).padStart(2, '0')}`,
          productId: product.id,
          balance,
          // fixed dates: "now + 6 months" would change every day and break repeatability
          expiresAt: faker.date.between({ from: '2027-03-01', to: '2027-12-31' }),
        },
      });
    }
  }

  console.log(`seed: ${customers.length} customers, ${products.length} products, ${lotSeq} lots`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());