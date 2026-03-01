import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const securizen = await prisma.company.upsert({
    where: { slug: 'securizen' },
    update: {},
    create: {
      name: 'Securizen',
      slug: 'securizen',
      legalName: 'Securizen Security Solutions Pvt Ltd',
      gstin: '27AABCS1234A1Z5',
      phone: '+91 98765 43210',
      email: 'info@securizen.in',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      tallyCompanyName: 'Securizen Security Solutions',
    },
  });

  const cloudcctv = await prisma.company.upsert({
    where: { slug: 'cloudcctv' },
    update: {},
    create: {
      name: 'CloudCCTV',
      slug: 'cloudcctv',
      legalName: 'CloudCCTV Technologies Pvt Ltd',
      gstin: '27AABCC5678B1Z3',
      phone: '+91 98765 11111',
      email: 'info@cloudcctv.in',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400051',
      tallyCompanyName: 'CloudCCTV Technologies',
    },
  });

  console.log('✅ Companies created');

  const passwordHash = await bcrypt.hash('Admin@1234', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@securizen.in' },
    update: {},
    create: {
      email: 'admin@securizen.in',
      phone: '+91 98765 00001',
      fullName: 'System Admin',
      passwordHash,
      status: 'ACTIVE',
    },
  });

  for (const company of [securizen, cloudcctv]) {
    await prisma.userCompany.upsert({
      where: { userId_companyId: { userId: admin.id, companyId: company.id } },
      update: {},
      create: {
        userId: admin.id,
        companyId: company.id,
        role: 'ADMIN',
        permissions: ['*'],
        isDefault: company.id === securizen.id,
      },
    });
  }

  const salesHash = await bcrypt.hash('Sales@1234', 10);
  const salesUser = await prisma.user.upsert({
    where: { email: 'sales@securizen.in' },
    update: {},
    create: {
      email: 'sales@securizen.in',
      phone: '+91 98765 00002',
      fullName: 'Raj Sharma',
      passwordHash: salesHash,
      status: 'ACTIVE',
    },
  });

  await prisma.userCompany.upsert({
    where: { userId_companyId: { userId: salesUser.id, companyId: securizen.id } },
    update: {},
    create: {
      userId: salesUser.id,
      companyId: securizen.id,
      role: 'SALES',
      permissions: ['crm.*', 'sales.*'],
      isDefault: true,
    },
  });

  console.log('✅ Users created');

  const currentFY = '2024-25';
  const sequences = [
    { documentType: 'QUOTATION', prefix: 'QTN' },
    { documentType: 'SALES_ORDER', prefix: 'SO' },
    { documentType: 'INVOICE', prefix: 'INV' },
    { documentType: 'PURCHASE_ORDER', prefix: 'PO' },
    { documentType: 'SERVICE_TICKET', prefix: 'ST' },
  ];

  for (const company of [securizen, cloudcctv]) {
    for (const seq of sequences) {
      await prisma.docSequence.upsert({
        where: {
          companyId_documentType_fiscalYear: {
            companyId: company.id,
            documentType: seq.documentType as any,
            fiscalYear: currentFY,
          },
        },
        update: {},
        create: {
          companyId: company.id,
          documentType: seq.documentType as any,
          prefix: seq.prefix,
          lastNumber: 0,
          padding: 4,
          fiscalYear: currentFY,
        },
      });
    }
  }

  console.log('✅ Document sequences created');

  const products = [
    { sku: 'CAM-HIK-2MP', name: 'Hikvision 2MP IP Camera', costPrice: 3200, salePrice: 4500, taxRate: 18, hsnCode: '85258090' },
    { sku: 'CAM-HIK-4MP', name: 'Hikvision 4MP IP Camera', costPrice: 5500, salePrice: 7500, taxRate: 18, hsnCode: '85258090' },
    { sku: 'DVR-HIK-8CH', name: 'Hikvision 8 Channel DVR', costPrice: 7000, salePrice: 9500, taxRate: 18, hsnCode: '85219090' },
    { sku: 'NVR-HIK-16CH', name: 'Hikvision 16 Channel NVR', costPrice: 12000, salePrice: 16500, taxRate: 18, hsnCode: '85219090' },
    { sku: 'HDD-WD-2TB', name: 'WD Purple 2TB HDD', costPrice: 5200, salePrice: 6800, taxRate: 18, hsnCode: '84717090' },
    { sku: 'CBL-CAT6-305M', name: 'CAT6 Cable Roll 305m', costPrice: 2800, salePrice: 3800, taxRate: 18, hsnCode: '85444290' },
    { sku: 'SVC-INSTALL', name: 'Camera Installation Charges', costPrice: 300, salePrice: 800, taxRate: 18, hsnCode: '998719', isStorable: false, isService: true },
    { sku: 'SVC-AMC', name: 'Annual Maintenance Contract', costPrice: 500, salePrice: 2000, taxRate: 18, hsnCode: '998719', isStorable: false, isService: true },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.sku },
      update: {},
      create: {
        id: p.sku,
        companyId: securizen.id,
        sku: p.sku,
        name: p.name,
        costPrice: p.costPrice,
        salePrice: p.salePrice,
        taxRate: p.taxRate,
        hsnCode: p.hsnCode,
        isStorable: p.isStorable ?? true,
        isService: p.isService ?? false,
      },
    });
  }

  console.log('✅ Products created');

  const contact = await prisma.contact.create({
    data: {
      companyId: securizen.id,
      type: 'CUSTOMER',
      firstName: 'Anil',
      lastName: 'Mehta',
      companyName: 'Mehta Retail Pvt Ltd',
      jobTitle: 'IT Manager',
      email: 'anil.mehta@mehtaretail.com',
      phone: '+91 98200 11111',
      whatsapp: '+91 98200 11111',
      gstin: '27AABCM1234A1Z5',
    },
  });

  await prisma.lead.create({
    data: {
      companyId: securizen.id,
      contactId: contact.id,
      title: 'CCTV Installation — Mehta Retail Head Office',
      stage: 'QUALIFIED',
      source: 'REFERRAL',
      priority: 2,
      probability: 60,
      expectedValue: 125000,
      assignedTo: salesUser.id,
      description: 'Need 16 cameras + NVR for 3-floor office.',
    },
  });

  console.log('✅ Sample contact & lead created');
  console.log('\n🎉 Seed complete!');
  console.log('\nLogin: admin@securizen.in / Admin@1234');
  console.log('Login: sales@securizen.in / Sales@1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });