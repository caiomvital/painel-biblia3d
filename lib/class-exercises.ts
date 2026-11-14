import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { assertExerciseEditable, validateExerciseInput, type ExerciseInput, type ExerciseOption } from "@/lib/class-exercise-rules";

function fail(message: string, statusCode = 400): never {
  throw Object.assign(new Error(message), { statusCode });
}

export async function createClassExercise(userId: string, input: ExerciseInput) {
  const data = validateExerciseInput(input);
  const classes = await prisma.$queryRawUnsafe<{ id: string }[]>(
    'SELECT c."id" FROM "Class" c JOIN "Teacher" t ON t."id" = c."teacherId" JOIN "Lesson" l ON l."classId" = c."id" WHERE c."id" = $1 AND l."id" = $2 AND t."userId" = $3 AND c."status" <> \'FINISHED\'', data.classId, data.lessonId, userId,
  );
  if (!classes.length) fail("Aula não encontrada nesta turma ou não atribuída a este professor.", 403);
  const id = randomUUID();
  await prisma.$executeRawUnsafe(
    'INSERT INTO "ClassExercise" ("id","classId","lessonId","teacherId","title","question","explanation","options","correctOption","correctXp","correctCoins","attemptXp","attemptCoins") SELECT $1,c."id",l."id",t."id",$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12 FROM "Class" c JOIN "Teacher" t ON t."id" = c."teacherId" JOIN "Lesson" l ON l."classId"=c."id" WHERE c."id" = $2 AND l."id"=$3 AND t."userId" = $13',
    id, data.classId, data.lessonId, data.title, data.question, data.explanation || null, JSON.stringify(data.options), data.correctOption, data.correctXp, data.correctCoins, data.attemptXp, data.attemptCoins, userId,
  );
  return { id, classId: data.classId, lessonId: data.lessonId, title: data.title };
}

export async function listTeacherExercises(userId: string, classId?: string) {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT e."id",e."classId",e."lessonId",l."title" AS "lessonTitle",c."name" AS "className",e."title",e."question",e."explanation",e."options",e."correctOption",e."correctXp",e."correctCoins",e."attemptXp",e."attemptCoins",e."createdAt",e."publishedAt",e."archivedAt",COALESCE(stats."answerCount",0)::int AS "answerCount",COALESCE(stats."correctCount",0)::int AS "correctCount",COALESCE(stats."wrongCount",0)::int AS "wrongCount",(SELECT count(*)::int FROM "Enrollment" n WHERE n."classId"=e."classId" AND n."status"='ACTIVE') AS "studentCount",COALESCE(stats."answers",'[]'::jsonb) AS "answers",(SELECT COALESCE(jsonb_agg(jsonb_build_object('studentId',s.id,'studentName',u.name) ORDER BY u.name),'[]'::jsonb) FROM "Enrollment" n JOIN "Student" s ON s.id=n."studentId" JOIN "User" u ON u.id=s."userId" LEFT JOIN "ClassExerciseAttempt" pendingAttempt ON pendingAttempt."exerciseId"=e.id AND pendingAttempt."studentId"=s.id WHERE n."classId"=e."classId" AND n.status='ACTIVE' AND pendingAttempt.id IS NULL) AS "pendingStudents" FROM "ClassExercise" e JOIN "Class" c ON c."id"=e."classId" LEFT JOIN "Lesson" l ON l."id"=e."lessonId" JOIN "Teacher" t ON t."id"=e."teacherId" LEFT JOIN LATERAL (SELECT count(*)::int AS "answerCount",count(*) FILTER (WHERE a."isCorrect")::int AS "correctCount",count(*) FILTER (WHERE NOT a."isCorrect")::int AS "wrongCount",jsonb_agg(jsonb_build_object('studentName',u."name",'selectedOption',a."selectedOption",'selectedText',choice.option->>'text','isCorrect',a."isCorrect",'answeredAt',a."answeredAt",'xpAwarded',a."xpAwarded",'coinsAwarded',a."coinsAwarded") ORDER BY a."answeredAt") AS "answers" FROM "ClassExerciseAttempt" a JOIN "Student" s ON s."id"=a."studentId" JOIN "User" u ON u."id"=s."userId" LEFT JOIN LATERAL (SELECT value AS option FROM jsonb_array_elements(e."options") WHERE value->>'id'=a."selectedOption" LIMIT 1) choice ON true WHERE a."exerciseId"=e."id") stats ON true WHERE t."userId"=$1 ${classId ? 'AND e."classId"=$2' : ''} ORDER BY e."createdAt" DESC`,
    ...classId ? [userId, classId] : [userId],
  );
  return rows;
}

export async function listStudentExercises(userId: string) {
  return prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT e."id",e."classId",e."lessonId",l."title" AS "lessonTitle",c."name" AS "className",e."title",e."question",e."options",CASE WHEN a."id" IS NOT NULL THEN e."correctOption" ELSE NULL END AS "correctOption",CASE WHEN a."id" IS NOT NULL THEN e."explanation" ELSE NULL END AS "explanation",e."correctXp",e."correctCoins",e."attemptXp",e."attemptCoins",e."createdAt",a."selectedOption",a."isCorrect",a."xpAwarded",a."coinsAwarded",a."answeredAt" FROM "Student" s JOIN "Enrollment" n ON n."studentId"=s."id" AND n."status"='ACTIVE' JOIN "Class" c ON c."id"=n."classId" JOIN "ClassExercise" e ON e."classId"=c."id" AND e."publishedAt" IS NOT NULL AND e."archivedAt" IS NULL LEFT JOIN "Lesson" l ON l."id"=e."lessonId" LEFT JOIN "ClassExerciseAttempt" a ON a."exerciseId"=e."id" AND a."studentId"=s."id" WHERE s."userId"=$1 ORDER BY e."createdAt" DESC`, userId,
  );
}

export async function answerClassExercise(userId: string, exerciseId: string, selectedOption: string) {
  const students = await prisma.$queryRawUnsafe<{ id: string }[]>('SELECT "id" FROM "Student" WHERE "userId"=$1', userId);
  if (!students.length) fail("Perfil de aluno não encontrado.", 403);
  const studentId = students[0].id;
  const exercises = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT e."id",e."classId",e."title",e."options",e."correctOption",e."correctXp",e."correctCoins",e."attemptXp",e."attemptCoins" FROM "ClassExercise" e JOIN "Enrollment" n ON n."classId"=e."classId" AND n."studentId"=$2 AND n."status"='ACTIVE' WHERE e."id"=$1 AND e."publishedAt" IS NOT NULL AND e."archivedAt" IS NULL FOR UPDATE OF e`, exerciseId, studentId,
  );
  const exercise = exercises[0];
  if (!exercise) fail("Exercício não encontrado para sua turma.", 404);
  const options = exercise.options as ExerciseOption[];
  if (!options.some(option => option.id === selectedOption)) fail("Alternativa inválida.");
  const isCorrect = selectedOption === exercise.correctOption;
  const xp = Number(isCorrect ? exercise.correctXp : exercise.attemptXp);
  const coins = Number(isCorrect ? exercise.correctCoins : exercise.attemptCoins);
  const attemptId = randomUUID();
  try {
    await prisma.$executeRawUnsafe(
      'INSERT INTO "ClassExerciseAttempt" ("id","exerciseId","studentId","selectedOption","isCorrect","xpAwarded","coinsAwarded") VALUES ($1,$2,$3,$4,$5,$6,$7)',
      attemptId, exerciseId, studentId, selectedOption, isCorrect, xp, coins,
    );
  } catch (error) {
    if (String(error).includes("ClassExerciseAttempt_exerciseId_studentId_key")) fail("Você já respondeu este exercício e não pode alterar a resposta.", 409);
    throw error;
  }
  const updated = await prisma.$queryRawUnsafe<{ currentXp: number; level: number; coinBalance: number }[]>(
    'UPDATE "Student" SET "currentXp"="currentXp"+$2,"level"=FLOOR(("currentXp"+$2)::numeric/300)::int+1,"coinBalance"="coinBalance"+$3,"updatedAt"=NOW() WHERE "id"=$1 RETURNING "currentXp","level","coinBalance"', studentId, xp, coins,
  );
  const originReference = `EXERCISE_${attemptId}`;
  await prisma.$executeRawUnsafe(
    'INSERT INTO "PointTransaction" ("id","studentId","amount","type","description","originReference") VALUES ($1,$2,$3,\'ACTIVITY\',$4,$5)',
    randomUUID(), studentId, xp, `Exercício: ${String(exercise.title ?? "múltipla escolha")}`, originReference,
  );
  await prisma.$executeRawUnsafe(
    'INSERT INTO "CoinTransaction" ("id","studentId","type","amount","description","originReference") VALUES ($1,$2,\'EARNED\',$3,$4,$5)',
    randomUUID(), studentId, coins, "Recompensa de exercício", originReference,
  );
  return { isCorrect, xpAwarded: xp, coinsAwarded: coins, student: updated[0] };
}

export async function publishClassExercise(userId: string, id: string) {
  const rows = await prisma.$queryRawUnsafe<{ id: string; publishedAt: Date }[]>(
    'UPDATE "ClassExercise" e SET "publishedAt"=NOW() FROM "Teacher" t WHERE e."id"=$1 AND e."teacherId"=t."id" AND t."userId"=$2 AND e."publishedAt" IS NULL AND e."archivedAt" IS NULL RETURNING e."id",e."publishedAt"', id, userId,
  );
  if (rows[0]) return rows[0];
  const owned = await prisma.$queryRawUnsafe<{ id: string; archivedAt: Date | null }[]>('SELECT e."id",e."archivedAt" FROM "ClassExercise" e JOIN "Teacher" t ON t."id"=e."teacherId" WHERE e."id"=$1 AND t."userId"=$2', id, userId);
  if (!owned.length) fail("Exercício não encontrado.", 404);
  if (owned[0].archivedAt) fail("Restaure o exercício antes de publicá-lo.", 409);
  fail("Este exercício já foi publicado.", 409);
}

export async function setClassExerciseArchived(userId: string, id: string, archived: boolean) {
  const target = archived ? "NOW()" : "NULL";
  const condition = archived ? 'e."archivedAt" IS NULL' : 'e."archivedAt" IS NOT NULL';
  const changed = await prisma.$queryRawUnsafe<{ id: string; archivedAt: Date | null }[]>(
    `UPDATE "ClassExercise" e SET "archivedAt"=${target} FROM "Teacher" t WHERE e."id"=$1 AND e."teacherId"=t."id" AND t."userId"=$2 AND ${condition} RETURNING e."id",e."archivedAt"`, id, userId,
  );
  if (changed[0]) return changed[0];
  const owned = await prisma.$queryRawUnsafe<{ id: string; archivedAt: Date | null }[]>(
    'SELECT e."id",e."archivedAt" FROM "ClassExercise" e JOIN "Teacher" t ON t."id"=e."teacherId" WHERE e."id"=$1 AND t."userId"=$2', id, userId,
  );
  if (!owned.length) fail("Exercício não encontrado.", 404);
  return owned[0];
}

export async function updateClassExercise(userId: string, id: string, input: ExerciseInput) {
  const data = validateExerciseInput(input);
  const updated = await prisma.$queryRawUnsafe<{ id: string }[]>(
    'UPDATE "ClassExercise" e SET "classId"=$2,"lessonId"=$3,"title"=$4,"question"=$5,"explanation"=$6,"options"=$7::jsonb,"correctOption"=$8,"correctXp"=$9,"correctCoins"=$10,"attemptXp"=$11,"attemptCoins"=$12 FROM "Teacher" t WHERE e."id"=$1 AND e."teacherId"=t."id" AND t."userId"=$13 AND NOT EXISTS (SELECT 1 FROM "ClassExerciseAttempt" a WHERE a."exerciseId"=e."id") AND EXISTS (SELECT 1 FROM "Class" c JOIN "Lesson" l ON l."classId"=c."id" WHERE c."id"=$2 AND c."teacherId"=t."id" AND c."status" <> \'FINISHED\' AND l."id"=$3) RETURNING e."id"',
    id, data.classId, data.lessonId, data.title, data.question, data.explanation || null, JSON.stringify(data.options), data.correctOption, data.correctXp, data.correctCoins, data.attemptXp, data.attemptCoins, userId,
  );
  if (updated[0]) return { id, title: data.title };
  const owned = await prisma.$queryRawUnsafe<{ answerCount: number }[]>(
    'SELECT count(a."id")::int AS "answerCount" FROM "ClassExercise" e JOIN "Teacher" t ON t."id"=e."teacherId" LEFT JOIN "ClassExerciseAttempt" a ON a."exerciseId"=e."id" WHERE e."id"=$1 AND t."userId"=$2 GROUP BY e."id"', id, userId,
  );
  if (!owned.length) fail("Exercício não encontrado.", 404);
  assertExerciseEditable(owned[0].answerCount);
  fail("A aula informada não pertence à turma do exercício.", 400);
}
