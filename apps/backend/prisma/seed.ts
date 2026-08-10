

await prisma.user.upsert({
  where: { email: 'admin@yekis.et' },
  update: {},
  create: {
    email: 'admin@yekis.et',
    phone: '+251910011818',
    passwordHash: await bcrypt.hash('test1234', 12),
    role: 'CLIENT',
    dateOfBirth: new Date('1990-01-01'),
    staffRole: 'ADMIN',
    kyc: { create: { tier: 'TIER_1', status: 'VERIFIED' } },
    wallet: { create: { balanceMinor: 0 } },
  },
});