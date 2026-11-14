import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { hash, compare } from 'bcryptjs';
import { assertTestDatabase } from '../tests/helpers/database';

const url = assertTestDatabase(process.env.TEST_DATABASE_URL);
if (process.env.DATABASE_URL !== url || process.env.DIRECT_URL !== url) throw new Error('Conexões de teste divergentes.');
const { prisma } = await import('../lib/prisma');
const { getAccount, savePreferences, changePassword } = await import('../lib/account-service');
const { defaultPreferences } = await import('../lib/panel-preferences');
const { getPanelTasks } = await import('../lib/panel-tasks');
const { getReport, toCsv } = await import('../lib/report-data');
const { trackedChange } = await import('../lib/panel-events');
const { placeAuctionBid, closeAuctionItem } = await import('../lib/auction-service');
const { requestRegistration, reviewRegistration } = await import('../lib/registration-service');
const { healthDetails } = await import('../lib/health');
const prefix = `panel_${randomUUID()}`;
const oldPassword = 'Senha-antiga-local-123';
const newPassword = 'senha456';
const userIds: string[] = [];
let checks = 0;
const pass = (name: string) => console.log(`PASS Painel ${++checks}: ${name}`);
try {
  const passwordHash = await hash(oldPassword, 10);
  for (const [suffix, role] of [['director', 'DIRETOR'], ['teacher', 'PROFESSOR'], ['otherteacher', 'PROFESSOR'], ['student', 'ALUNO'], ['second', 'ALUNO']] as const) {
    const id = `${prefix}_${suffix}`;
    await prisma.user.create({ data: { id, email: `${id}@example.test`, name: id, role, passwordHash,
      ...(role === 'ALUNO' ? { student: { create: { id: `${id}_profile`, registrationNumber: id, coinBalance: 500 } } } : role === 'PROFESSOR' ? { teacher: { create: { id: `${id}_profile` } } } : { director: { create: {} } }),
    } }); userIds.push(id);
  }
  const studentId = `${prefix}_student_profile`, secondId = `${prefix}_second_profile`;
  const session = { id: `${prefix}_student`, email: `${prefix}_student@example.test`, name: `${prefix}_student`, role: 'ALUNO' as const, sessionVersion: 0 };
  const director = { id: `${prefix}_director`, email: `${prefix}_director@example.test`, name: `${prefix}_director`, role: 'DIRETOR' as const };
  const prefs = { ...defaultPreferences, color: 'violet' as const, textSize: 'large' as const, notifications: { ACCOUNT: true, ACADEMIC: false, AUCTION: true } };
  await savePreferences(session.id, prefs);
  assert.deepEqual((await getAccount(session.id)).preferences, prefs);
  await assert.rejects(() => savePreferences(session.id, { ...prefs, color: 'invalid' }));
  assert.deepEqual((await getAccount(`${prefix}_second`)).preferences, defaultPreferences);
  pass('preferências persistidas, validação e isolamento entre contas');

  const input = { currentPassword: oldPassword, newPassword, confirmPassword: newPassword };
  await assert.rejects(() => changePassword(session, { ...input, currentPassword: 'senha-incorreta' }));
  await assert.rejects(() => changePassword(session, { ...input, confirmPassword: 'diferente' }));
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: session.id } })).sessionVersion, 0);
  const changes = await Promise.allSettled([changePassword(session, input), changePassword(session, input)]);
  assert.equal(changes.filter(r => r.status === 'fulfilled').length, 1);
  const changed = await prisma.user.findUniqueOrThrow({ where: { id: session.id } });
  assert.equal(changed.sessionVersion, 1);
  assert.ok(await compare(newPassword, changed.passwordHash));
  assert.ok(!await compare(oldPassword, changed.passwordHash));
  await assert.rejects(() => changePassword(session, { currentPassword: newPassword, newPassword: 'Outra-senha-local-789', confirmPassword: 'Outra-senha-local-789' }));
  assert.equal(await prisma.auditLog.count({ where: { actorId: session.id, action: 'Senha alterada' } }), 1);
  pass('senha incorreta e sessão antiga recusadas; troca concorrente altera uma única vez');

  await prisma.course.create({ data: { id: `${prefix}_course`, code: prefix, name: 'Curso local' } });
  await prisma.class.create({ data: { id: `${prefix}_class`, code: prefix, name: 'Turma local', courseId: `${prefix}_course`, teacherId: `${prefix}_teacher_profile`, startDate: new Date('2026-01-01'), daysOfWeek: 'SEG', scheduleTime: '19:00 - 22:00' } });
  await prisma.enrollment.createMany({ data: [studentId, secondId].map(studentId => ({ classId: `${prefix}_class`, studentId })) });
  const lessonData = (id: string, date: string, scheduleTime = '19:00 - 22:00') => ({ id: `${prefix}_${id}`, title: id, classId: `${prefix}_class`, teacherId: `${prefix}_teacher_profile`, lessonNumber: 1, date: new Date(date), scheduleTime, plannedContent: '' });
  for (const [id, status, time] of [['completed', 'COMPLETED', '07:00'], ['cancelled', 'CANCELLED', '08:00'], ['started', 'IN_PROGRESS', '09:00'], ['past-time', 'SCHEDULED', '10:00'], ['next', 'SCHEDULED', '19:00']] as const) await prisma.lesson.create({ data: { ...lessonData(id, '2026-10-09', time), status } });
  await prisma.lesson.create({ data: lessonData('tomorrow', '2026-10-10') });
  let tasks = await getPanelTasks(session, new Date('2026-10-09T20:00:00Z'));
  assert.equal(tasks.tasks.find(t => t.title === 'Sua próxima aula')?.id, `${prefix}_next`);
  tasks = await getPanelTasks(session, new Date('2026-10-10T01:00:00Z'));
  assert.equal(tasks.tasks.find(t => t.title === 'Sua próxima aula')?.id, `${prefix}_tomorrow`);
  await prisma.lesson.update({ where: { id: `${prefix}_past-time` }, data: { scheduleTime: '23:00' } });
  tasks = await getPanelTasks(session, new Date('2026-10-10T01:00:00Z'));
  assert.equal(tasks.tasks.find(t => t.title === 'Sua próxima aula')?.id, `${prefix}_past-time`);
  pass('próxima aula exclui conclusão/cancelamento/horário passado e considera a data de Recife');

  for (const [index, status] of ['PRESENT', 'ABSENT', 'EXCUSED', 'PENDING'].entries()) {
    const lesson = await prisma.lesson.create({ data: lessonData(`frequency-${index}`, `2026-01-0${index + 1}`) });
    await prisma.attendance.create({ data: { lessonId: lesson.id, studentId, status: status as 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'PENDING' } });
  }
  const reportParams = new URLSearchParams({ type: 'attendance', classId: `${prefix}_class`, from: '2026-01-01', to: '2026-01-04' });
  const report = await getReport(reportParams);
  const row = report.rows.find(r => r[1] === session.name)!;
  assert.deepEqual(row.slice(2), [1, 1, 1, 1, 33]);
  assert.equal(report.rows.find(r => r[1] === `${prefix}_second`)?.[6], null);
  reportParams.set('type', 'low-frequency');
  assert.equal((await getReport(reportParams)).rows.length, 1);
  reportParams.set('type', 'attendance'); reportParams.set('to', '2026-01-01');
  assert.equal((await getReport(reportParams)).rows.find(r => r[1] === session.name)?.[6], 100);
  assert.match(toCsv(['Nome'], [['=formula']]), /'=formula/);
  const teacherTasks = await getPanelTasks({ ...session, id: `${prefix}_teacher`, role: 'PROFESSOR' });
  const otherTasks = await getPanelTasks({ ...session, id: `${prefix}_otherteacher`, role: 'PROFESSOR' });
  assert.ok(teacherTasks.tasks.some(t => t.classId === `${prefix}_class`));
  assert.ok(!otherTasks.tasks.some(t => t.classId === `${prefix}_class`));
  pass('relatórios com frequência correta, ausência de dados resolvidos, período e escopo do professor');

  await assert.rejects(() => trackedChange(director, 'Rollback teste', `${prefix}_rollback`, '', async () => {
    await prisma.$transaction(async tx => tx.course.create({ data: { id: `${prefix}_rollback`, code: `${prefix}_rollback`, name: 'Não persistir' } }));
    throw new Error('Rollback intencional');
  }));
  assert.equal(await prisma.course.count({ where: { id: `${prefix}_rollback` } }), 0);
  assert.equal(await prisma.auditLog.count({ where: { entityId: `${prefix}_rollback` } }), 0);
  await trackedChange(director, 'Turma atualizada', `${prefix}_class`, 'Ajuste de horário', () => prisma.class.update({ where: { id: `${prefix}_class` }, data: { scheduleTime: '18:00 - 21:00' } }));
  assert.equal(await prisma.notification.count({ where: { userId: session.id, title: 'Turma atualizada' } }), 1);
  assert.equal((await prisma.auditLog.findFirstOrThrow({ where: { entityId: `${prefix}_class` } })).reason, 'Ajuste de horário');
  pass('auditoria e notificações são atômicas com a alteração; rollback não deixa dados parciais');

  await prisma.auctionSeason.create({ data: { id: `${prefix}_season`, title: 'Temporada local', endsAt: new Date('2099-01-01') } });
  await prisma.auctionItem.create({ data: { id: `${prefix}_item`, seasonId: `${prefix}_season`, title: 'Lote local', category: 'Teste', description: 'Teste', currentBid: 100, minNextBid: 150, endsAt: new Date('2099-01-01') } });
  assert.equal((await placeAuctionBid(`${prefix}_item`, studentId, 150)).success, true);
  assert.equal((await placeAuctionBid(`${prefix}_item`, secondId, 200)).success, true);
  assert.equal(await prisma.notification.count({ where: { userId: session.id, title: 'Seu lance foi superado' } }), 1);
  await closeAuctionItem(`${prefix}_item`); await closeAuctionItem(`${prefix}_item`);
  assert.equal(await prisma.notification.count({ where: { userId: `${prefix}_second`, title: 'Você arrematou um lote' } }), 1);
  const auctions = await getReport(new URLSearchParams({ type: 'auctions', seasonId: `${prefix}_season` }));
  assert.equal(auctions.rows[0][2], 'Encerrado'); assert.equal(auctions.rows[0][5], 200);
  pass('lance superado, vencedor e encerramento idempotente geram avisos e resultado correto');

  const registration = await requestRegistration({ name: prefix, email: `${prefix}_applicant@example.test`, password: 'senha123', course: 'JAVA' });
  const applicant = await prisma.user.findUniqueOrThrow({ where: { email: `${prefix}_applicant@example.test` } }); userIds.push(applicant.id);
  await reviewRegistration(director.id, registration!.id, 'APPROVED', 'ALUNO');
  await reviewRegistration(director.id, registration!.id, 'APPROVED', 'ALUNO');
  assert.equal(await prisma.notification.count({ where: { userId: applicant.id, title: 'Cadastro aprovado' } }), 1);
  const auditText = JSON.stringify(await prisma.auditLog.findMany({ where: { actorId: { in: userIds } } }));
  assert.ok(!auditText.includes(oldPassword) && !auditText.includes(newPassword) && !auditText.includes('passwordHash'));
  pass('aprovação repetida não duplica aviso e auditoria não contém senhas');

  const migration = await prisma.$queryRaw<{ id: string; finished_at: Date | null }[]>`SELECT id, finished_at FROM "_prisma_migrations" WHERE migration_name = '20261011_secretary_role' AND finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  assert.equal(migration.length, 1);
  assert.equal((await healthDetails()).ready, true);
  try {
    await prisma.$executeRaw`UPDATE "_prisma_migrations" SET finished_at = NULL WHERE id = ${migration[0].id}`;
    const health = await healthDetails(); assert.equal(health.database, true); assert.equal(health.migrations, false); assert.equal(health.ready, false);
  } finally { await prisma.$executeRaw`UPDATE "_prisma_migrations" SET finished_at = ${migration[0].finished_at} WHERE id = ${migration[0].id}`; }
  pass('prontidão recusa migração nova ausente mesmo com migração anterior e banco disponíveis');
} finally {
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: userIds } }, { entityId: { startsWith: prefix } }] } });
  await prisma.auctionSeason.deleteMany({ where: { id: `${prefix}_season` } });
  await prisma.course.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
}
