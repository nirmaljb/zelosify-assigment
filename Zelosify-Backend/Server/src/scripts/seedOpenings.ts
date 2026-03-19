import prisma from "../config/prisma/prisma.js";

/**
 * Seeds the database with Bruce Wayne Corp tenant and sample contract openings.
 * All seed data belongs to a single tenant for tenant isolation integrity.
 */
async function seedOpenings() {
  console.log("🌱 Seeding contract hiring data...");

  try {
    // Create or find the Bruce Wayne Corp tenant
    const tenant = await prisma.tenants.upsert({
      where: { tenantId: "bruce-wayne-corp-tenant-id" },
      update: {},
      create: {
        tenantId: "bruce-wayne-corp-tenant-id",
        companyName: "Bruce Wayne Corp",
      },
    });

    console.log(`✅ Tenant created/found: ${tenant.companyName} (${tenant.tenantId})`);

    // Create hiring managers for the openings
    const hiringManager1 = await prisma.user.upsert({
      where: { externalId: "hm-lucius-fox" },
      update: {},
      create: {
        externalId: "hm-lucius-fox",
        email: "lucius.fox@waynecorp.com",
        firstName: "Lucius",
        lastName: "Fox",
        role: "HIRING_MANAGER",
        tenantId: tenant.tenantId,
        profileComplete: true,
      },
    });

    const hiringManager2 = await prisma.user.upsert({
      where: { externalId: "hm-alfred-pennyworth" },
      update: {},
      create: {
        externalId: "hm-alfred-pennyworth",
        email: "alfred.pennyworth@waynecorp.com",
        firstName: "Alfred",
        lastName: "Pennyworth",
        role: "HIRING_MANAGER",
        tenantId: tenant.tenantId,
        profileComplete: true,
      },
    });

    const hiringManager3 = await prisma.user.upsert({
      where: { externalId: "hm-barbara-gordon" },
      update: {},
      create: {
        externalId: "hm-barbara-gordon",
        email: "barbara.gordon@waynecorp.com",
        firstName: "Barbara",
        lastName: "Gordon",
        role: "HIRING_MANAGER",
        tenantId: tenant.tenantId,
        profileComplete: true,
      },
    });

    // Create an IT Vendor user for testing
    await prisma.user.upsert({
      where: { externalId: "vendor-acme-tech" },
      update: {},
      create: {
        externalId: "vendor-acme-tech",
        email: "contact@acmetech.com",
        firstName: "Acme",
        lastName: "Technologies",
        role: "IT_VENDOR",
        tenantId: tenant.tenantId,
        profileComplete: true,
      },
    });

    console.log("✅ Users created/found");

    // Define 12+ openings with varied roles, experience ranges, and contract types
    const openingsData = [
      {
        id: "opening-001",
        title: "Senior Software Engineer",
        description: "Build and maintain enterprise applications for Wayne Enterprises R&D division.",
        location: "Gotham City",
        contractType: "Full-Time Contract",
        hiringManagerId: hiringManager1.id,
        experienceMin: 5,
        experienceMax: 10,
        requiredSkills: ["TypeScript", "Node.js", "React", "PostgreSQL", "AWS"],
      },
      {
        id: "opening-002",
        title: "DevOps Engineer",
        description: "Manage CI/CD pipelines and cloud infrastructure for Wayne Tech.",
        location: "Remote",
        contractType: "Full-Time Contract",
        hiringManagerId: hiringManager1.id,
        experienceMin: 3,
        experienceMax: 7,
        requiredSkills: ["Docker", "Kubernetes", "AWS", "Terraform", "Jenkins"],
      },
      {
        id: "opening-003",
        title: "Junior Frontend Developer",
        description: "Assist in building user interfaces for internal tools.",
        location: "Gotham City",
        contractType: "Part-Time Contract",
        hiringManagerId: hiringManager2.id,
        experienceMin: 0,
        experienceMax: 2,
        requiredSkills: ["JavaScript", "React", "CSS", "HTML"],
      },
      {
        id: "opening-004",
        title: "Data Scientist",
        description: "Analyze security threat patterns and develop predictive models.",
        location: "Gotham City",
        contractType: "Full-Time Contract",
        hiringManagerId: hiringManager1.id,
        experienceMin: 4,
        experienceMax: 8,
        requiredSkills: ["Python", "TensorFlow", "SQL", "Machine Learning", "Statistics"],
      },
      {
        id: "opening-005",
        title: "Cybersecurity Analyst",
        description: "Monitor and protect Wayne Enterprises networks from cyber threats.",
        location: "Gotham City",
        contractType: "Full-Time Contract",
        hiringManagerId: hiringManager3.id,
        experienceMin: 3,
        experienceMax: 6,
        requiredSkills: ["Network Security", "SIEM", "Penetration Testing", "Firewalls", "Incident Response"],
      },
      {
        id: "opening-006",
        title: "QA Automation Engineer",
        description: "Develop and maintain automated test suites for enterprise software.",
        location: "Remote",
        contractType: "Contract-to-Hire",
        hiringManagerId: hiringManager2.id,
        experienceMin: 2,
        experienceMax: 5,
        requiredSkills: ["Selenium", "Jest", "Cypress", "Python", "CI/CD"],
      },
      {
        id: "opening-007",
        title: "Cloud Architect",
        description: "Design scalable cloud solutions for Wayne Tech divisions.",
        location: "Gotham City",
        contractType: "Full-Time Contract",
        hiringManagerId: hiringManager1.id,
        experienceMin: 8,
        experienceMax: 15,
        requiredSkills: ["AWS", "Azure", "System Design", "Microservices", "Security"],
      },
      {
        id: "opening-008",
        title: "Mobile Developer",
        description: "Build cross-platform mobile applications for Wayne Foundation.",
        location: "Remote",
        contractType: "Part-Time Contract",
        hiringManagerId: hiringManager3.id,
        experienceMin: 2,
        experienceMax: 5,
        requiredSkills: ["React Native", "TypeScript", "iOS", "Android", "REST APIs"],
      },
      {
        id: "opening-009",
        title: "Technical Project Manager",
        description: "Lead cross-functional teams on technology initiatives.",
        location: "Gotham City",
        contractType: "Full-Time Contract",
        hiringManagerId: hiringManager2.id,
        experienceMin: 6,
        experienceMax: 12,
        requiredSkills: ["Agile", "Scrum", "JIRA", "Stakeholder Management", "Risk Management"],
      },
      {
        id: "opening-010",
        title: "Backend Developer",
        description: "Develop APIs and microservices for Wayne Enterprises platforms.",
        location: "Gotham City",
        contractType: "Contract-to-Hire",
        hiringManagerId: hiringManager1.id,
        experienceMin: 3,
        experienceMax: 6,
        requiredSkills: ["Node.js", "Express", "PostgreSQL", "Redis", "GraphQL"],
      },
      {
        id: "opening-011",
        title: "UI/UX Designer",
        description: "Design intuitive interfaces for Wayne Tech products.",
        location: "Remote",
        contractType: "Part-Time Contract",
        hiringManagerId: hiringManager3.id,
        experienceMin: 2,
        experienceMax: 6,
        requiredSkills: ["Figma", "User Research", "Wireframing", "Prototyping", "Design Systems"],
      },
      {
        id: "opening-012",
        title: "Machine Learning Engineer",
        description: "Implement ML models for autonomous vehicle systems.",
        location: "Gotham City",
        contractType: "Full-Time Contract",
        hiringManagerId: hiringManager1.id,
        experienceMin: 4,
        experienceMax: 8,
        requiredSkills: ["Python", "PyTorch", "Computer Vision", "Deep Learning", "MLOps"],
      },
      {
        id: "opening-013",
        title: "Database Administrator",
        description: "Manage and optimize database systems across Wayne Enterprises.",
        location: "Gotham City",
        contractType: "Full-Time Contract",
        hiringManagerId: hiringManager2.id,
        experienceMin: 5,
        experienceMax: 10,
        requiredSkills: ["PostgreSQL", "MySQL", "MongoDB", "Database Tuning", "Backup & Recovery"],
      },
      {
        id: "opening-014",
        title: "Site Reliability Engineer",
        description: "Ensure high availability and performance of critical systems.",
        location: "Remote",
        contractType: "Contract-to-Hire",
        hiringManagerId: hiringManager3.id,
        experienceMin: 4,
        experienceMax: 8,
        requiredSkills: ["Linux", "Monitoring", "Prometheus", "Grafana", "Incident Management"],
      },
    ];

    // Upsert all openings
    for (const opening of openingsData) {
      await prisma.opening.upsert({
        where: { id: opening.id },
        update: {
          title: opening.title,
          description: opening.description,
          location: opening.location,
          contractType: opening.contractType,
          hiringManagerId: opening.hiringManagerId,
          experienceMin: opening.experienceMin,
          experienceMax: opening.experienceMax,
          requiredSkills: opening.requiredSkills,
        },
        create: {
          id: opening.id,
          tenantId: tenant.tenantId,
          title: opening.title,
          description: opening.description,
          location: opening.location,
          contractType: opening.contractType,
          hiringManagerId: opening.hiringManagerId,
          experienceMin: opening.experienceMin,
          experienceMax: opening.experienceMax,
          requiredSkills: opening.requiredSkills,
          status: "OPEN",
        },
      });
    }

    console.log(`✅ Created/updated ${openingsData.length} openings`);

    // Verify the seed
    const openingCount = await prisma.opening.count({
      where: { tenantId: tenant.tenantId },
    });

    console.log(`\n📊 Seed Summary:`);
    console.log(`   Tenant: ${tenant.companyName}`);
    console.log(`   Openings: ${openingCount}`);
    console.log(`   Hiring Managers: 3`);
    console.log(`   IT Vendor: 1`);
    console.log("\n✅ Seeding completed successfully!");

  } catch (error) {
    console.error("❌ Error seeding openings:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedOpenings();
