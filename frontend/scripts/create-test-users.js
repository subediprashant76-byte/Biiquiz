const fs = require("node:fs");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { createHmac } = require("node:crypto");

loadEnv();

const prisma = new PrismaClient();
const password = process.env.TEST_USER_PASSWORD || "Test@12345";
const authSecret = process.env.AUTH_SECRET || "replace-with-a-long-random-secret";

const organizations = [
  ["biiquiz-school-demo", "biiQuiz School Demo", "school"],
  ["biiquiz-enterprise-demo", "biiQuiz Enterprise Demo", "enterprise"],
  ["biiquiz-training-demo", "biiQuiz Training Demo", "pro"]
];

const users = [
  ["Personal Host One", "personal.host1@example.com", "host", null],
  ["Personal Host Two", "personal.host2@example.com", "host", null],
  ["School Admin", "school.admin@example.com", "admin", "biiquiz-school-demo"],
  ["School Host One", "school.host1@example.com", "host", "biiquiz-school-demo"],
  ["School Host Two", "school.host2@example.com", "host", "biiquiz-school-demo"],
  ["Enterprise Admin", "enterprise.admin@example.com", "admin", "biiquiz-enterprise-demo"],
  ["Enterprise Host One", "enterprise.host1@example.com", "host", "biiquiz-enterprise-demo"],
  ["Enterprise Host Two", "enterprise.host2@example.com", "host", "biiquiz-enterprise-demo"],
  ["Training Admin", "training.admin@example.com", "admin", "biiquiz-training-demo"],
  ["Training Host One", "training.host1@example.com", "host", "biiquiz-training-demo"]
];

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);
  const orgBySlug = {};
  for (const [slug, name, plan] of organizations) {
    orgBySlug[slug] = await prisma.organization.upsert({
      where: { slug },
      update: { name, plan, brandingJson: { primaryColor: "#1d4ed8" }, settingsJson: { sso: false, seatLimit: 50 } },
      create: { name, slug, plan, brandingJson: { primaryColor: "#1d4ed8" }, settingsJson: { sso: false, seatLimit: 50 } }
    });
  }

  const userByEmail = {};
  for (const [name, email, role, slug] of users) {
    userByEmail[email] = await prisma.user.upsert({
      where: { email },
      update: { name, role, organizationId: slug ? orgBySlug[slug].id : null, isActive: true, passwordHash },
      create: { name, email, role, organizationId: slug ? orgBySlug[slug].id : null, isActive: true, passwordHash },
      include: { organization: true }
    });
  }

  await seedAppData(userByEmail, orgBySlug);

  console.table(users.map(([name, email, role, slug]) => ({
    name,
    email,
    role,
    organization: slug || "personal",
    password
  })));
}

async function seedAppData(userByEmail, orgBySlug) {
  const hosts = [
    userByEmail["personal.host1@example.com"],
    userByEmail["school.host1@example.com"],
    userByEmail["enterprise.host1@example.com"],
    userByEmail["training.host1@example.com"]
  ];
  const subjects = ["Physics", "Biology", "Security", "Math"];

  for (const [index, host] of hosts.entries()) {
    const quiz = await prisma.quiz.upsert({
      where: { id: await stableQuizId(host.id, index + 1) },
      update: {
        hostId: host.id,
        organizationId: host.organizationId,
        status: "published",
        visibility: index === 0 ? "public" : "organization"
      },
      create: {
        id: await stableQuizId(host.id, index + 1),
        hostId: host.id,
        organizationId: host.organizationId,
        title: `Demo ${host.name} Quiz`,
        subject: subjects[index],
        description: "Seeded quiz for backend-driven UI testing.",
        defaultTimeLimit: 30,
        defaultMarks: 1,
        visibility: index === 0 ? "public" : "organization",
        status: "published"
      }
    });

    for (let orderNumber = 1; orderNumber <= 3; orderNumber += 1) {
      await prisma.question.upsert({
        where: { quizId_orderNumber: { quizId: quiz.id, orderNumber } },
        update: {
          questionText: `Question ${orderNumber} for ${quiz.title}?`,
          optionA: "Correct answer",
          optionB: "Distractor one",
          optionC: "Distractor two",
          optionD: "Distractor three",
          correctOption: "A",
          marks: 10,
          timeLimit: 30,
          explanation: "Seeded explanation."
        },
        create: {
          quizId: quiz.id,
          orderNumber,
          questionText: `Question ${orderNumber} for ${quiz.title}?`,
          optionA: "Correct answer",
          optionB: "Distractor one",
          optionC: "Distractor two",
          optionD: "Distractor three",
          correctOption: "A",
          marks: 10,
          timeLimit: 30,
          explanation: "Seeded explanation."
        }
      });
    }

    const firstQuestion = await prisma.question.findFirst({ where: { quizId: quiz.id }, orderBy: { orderNumber: "asc" } });
    const room = await prisma.room.upsert({
      where: { roomCode: `DEMO${index + 1}A` },
      update: { status: index === 0 ? "active" : "ended", currentQuestionId: firstQuestion?.id },
      create: {
        quizId: quiz.id,
        hostId: host.id,
        organizationId: host.organizationId,
        roomCode: `DEMO${index + 1}A`,
        roomName: `${quiz.subject || "Demo"} Live Room`,
        status: index === 0 ? "active" : "ended",
        participantLimit: host.organizationId ? 100 : 50,
        currentQuestionId: firstQuestion?.id,
        currentQuestionOrder: firstQuestion?.orderNumber,
        currentQuestionStartedAt: new Date(Date.now() - 10_000),
        currentQuestionEndsAt: new Date(Date.now() + 20_000),
        startedAt: new Date(Date.now() - 300_000),
        endedAt: index === 0 ? null : new Date(Date.now() - 60_000)
      }
    });

    for (let participantIndex = 1; participantIndex <= 5; participantIndex += 1) {
      const participant = await prisma.participant.upsert({
        where: { roomId_joinTokenHash: { roomId: room.id, joinTokenHash: hashToken(`${room.roomCode}-${participantIndex}`) } },
        update: { displayName: `Student ${participantIndex}`, lastSeenAt: new Date() },
        create: {
          roomId: room.id,
          displayName: `Student ${participantIndex}`,
          joinTokenHash: hashToken(`${room.roomCode}-${participantIndex}`),
          lastSeenAt: new Date()
        }
      });
      const questions = await prisma.question.findMany({ where: { quizId: quiz.id }, orderBy: { orderNumber: "asc" }, take: 2 });
      for (const question of questions) {
        const correct = participantIndex % 2 === 1;
        await prisma.answer.upsert({
          where: { participantId_questionId: { participantId: participant.id, questionId: question.id } },
          update: {},
          create: {
            roomId: room.id,
            participantId: participant.id,
            questionId: question.id,
            selectedOption: correct ? "A" : "B",
            isCorrect: correct,
            scoreAwarded: correct ? 10 : 0,
            responseTimeMs: 1200 + participantIndex * 100
          }
        });
      }
      const answers = await prisma.answer.findMany({ where: { participantId: participant.id } });
      await prisma.participant.update({
        where: { id: participant.id },
        data: {
          attemptedCount: answers.length,
          correctCount: answers.filter((answer) => answer.isCorrect).length,
          wrongCount: answers.filter((answer) => !answer.isCorrect).length,
          score: answers.reduce((total, answer) => total + answer.scoreAwarded, 0)
        }
      });
    }

    const existingGeneration = await prisma.aiGeneration.findFirst({ where: { hostId: host.id, quizId: quiz.id, inputTopic: "Seeded topic" } });
    const generationData = {
        hostId: host.id,
        quizId: quiz.id,
        inputPrompt: "Seeded prompt",
        inputSubject: quiz.subject || "General",
        inputLevel: "Demo",
        inputTopic: "Seeded topic",
        inputDifficulty: "mixed",
        inputLanguage: "English",
        questionCount: 2,
        marksPerQuestion: 10,
        timePerQuestion: 30,
        rawJson: { questions: [] },
        fixedJson: { questions: [] },
        status: "published",
        model: "gemini-2.5-flash"
      };
    const generation = existingGeneration
      ? await prisma.aiGeneration.update({ where: { id: existingGeneration.id }, data: generationData })
      : await prisma.aiGeneration.create({ data: generationData });
    const existingUsage = await prisma.aiUsageLog.findFirst({ where: { hostId: host.id, action: "generate", model: generation.model } });
    if (!existingUsage) {
      await prisma.aiUsageLog.create({ data: { hostId: host.id, organizationId: host.organizationId, action: "generate", questionCount: 2, model: generation.model, status: "success" } });
    }
  }

  for (const [slug, org] of Object.entries(orgBySlug)) {
    const admin = await prisma.user.findFirst({ where: { organizationId: org.id, role: "admin" } });
    await prisma.hostPass.upsert({
      where: { passCodeHash: hashToken(`${slug}-PASS-2026`) },
      update: { planName: titleCase(org.plan), participantLimit: org.plan === "pro" ? 250 : 500, assignedOrganizationId: org.id, createdByAdminId: admin?.id },
      create: {
        passCodeHash: hashToken(`${slug}-PASS-2026`),
        planName: titleCase(org.plan),
        participantLimit: org.plan === "pro" ? 250 : 500,
        validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        assignedOrganizationId: org.id,
        createdByAdminId: admin?.id
      }
    });
    const existingAudit = await prisma.auditLog.findFirst({ where: { organizationId: org.id, action: "seeded_demo_data", entityType: "organization", entityId: org.id } });
    if (!existingAudit) {
      await prisma.auditLog.create({ data: { actorUserId: admin?.id, organizationId: org.id, action: "seeded_demo_data", entityType: "organization", entityId: org.id, metadataJson: { source: "seed:test-users" } } });
    }
  }
}

async function stableQuizId(hostId, index) {
  const hex = createHmac("sha256", authSecret).update(`${hostId}:${index}`).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function hashToken(token) {
  return createHmac("sha256", authSecret).update(token).digest("hex");
}

function titleCase(value) {
  return String(value).slice(0, 1).toUpperCase() + String(value).slice(1);
}

function loadEnv() {
  const paths = ["../.env", ".env"];
  for (const path of paths) {
    if (!fs.existsSync(path)) continue;
    for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=["']?(.*?)["']?$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
