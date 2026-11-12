/**
 * Script para sincronizar e aprovar manualmente um pagamento do Mercado Pago
 * que possa ter ficado pendente devido a falhas no webhook.
 *
 * Uso:
 *   npx ts-node --transpile-only scripts/sync-mp-payment.ts <PAYMENT_ID>
 *
 * Exemplo:
 *   npx ts-node --transpile-only scripts/sync-mp-payment.ts 189241850210
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  CourseOrderStatus,
  EnrollmentSource,
  EnrollmentStatus,
  PrismaClient,
} from '@prisma/client';

const paymentId = process.argv[2]?.trim();
if (!paymentId) {
  console.error('Uso: npx ts-node --transpile-only scripts/sync-mp-payment.ts <PAYMENT_ID>');
  process.exit(1);
}

const accessToken = (process.env.MP_ACCESS_TOKEN ?? '')
  .trim()
  .replace(/^(["'])(.*)\1$/, '$2')
  .trim();

if (!accessToken) {
  console.error('Erro: MP_ACCESS_TOKEN não está configurado nas variáveis de ambiente.');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  console.log(`\nConsultando pagamento ${paymentId} na API do Mercado Pago...`);

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Falha ao buscar pagamento no Mercado Pago (HTTP ${response.status}):`, errorBody);
    process.exit(1);
  }

  const payment = (await response.json()) as {
    id: number | string;
    status: string;
    external_reference?: string | null;
    payment_type_id?: string | null;
    payer?: { email?: string; first_name?: string; last_name?: string };
    transaction_amount?: number;
  };

  console.log('Dados do pagamento recebidos do Mercado Pago:');
  console.log({
    id: payment.id,
    status: payment.status,
    external_reference: payment.external_reference,
    payment_type_id: payment.payment_type_id,
    payer_email: payment.payer?.email,
    transaction_amount: payment.transaction_amount,
  });

  if (!payment.external_reference) {
    console.error('Erro: Pagamento não possui external_reference (ID do pedido).');
    process.exit(1);
  }

  const orderId = payment.external_reference;
  const order = await prisma.courseOrder.findUnique({
    where: { id: orderId },
    include: {
      student: true,
      course: true,
    },
  });

  if (!order) {
    console.error(`Erro: Pedido "${orderId}" não encontrado no banco de dados local.`);
    process.exit(1);
  }

  console.log(`\nPedido encontrado:`);
  console.log(`- Aluno: ${order.student.name} (${order.student.email})`);
  console.log(`- Curso: ${order.course.title}`);
  console.log(`- Status atual: ${order.status}`);

  if (payment.status !== 'approved') {
    console.warn(`Atenção: O status do pagamento no Mercado Pago é "${payment.status}" (não é "approved").`);
    const proceed = process.env.FORCE_APPROVE === 'true';
    if (!proceed) {
      console.log('Cancelando. Para forçar aprovação, defina FORCE_APPROVE=true.');
      process.exit(0);
    }
  }

  console.log('\nAprovando pedido e ativando matrícula...');

  await prisma.courseOrder.update({
    where: { id: order.id },
    data: {
      status: CourseOrderStatus.APPROVED,
      mpPaymentId: String(payment.id),
      mpStatus: payment.status,
      paymentMethod: payment.payment_type_id ?? order.paymentMethod,
      paidAt: order.paidAt ?? new Date(),
    },
  });

  if (order.couponId) {
    await prisma.academyCoupon.update({
      where: { id: order.couponId },
      data: { usedCount: { increment: 1 } },
    });
  }

  const enrollment = await prisma.enrollment.upsert({
    where: {
      studentId_courseId: {
        studentId: order.studentId,
        courseId: order.courseId,
      },
    },
    update: {
      status: EnrollmentStatus.ACTIVE,
      orderId: order.id,
    },
    create: {
      studentId: order.studentId,
      courseId: order.courseId,
      orderId: order.id,
      source: EnrollmentSource.PURCHASE,
      status: EnrollmentStatus.ACTIVE,
    },
  });

  console.log(`\nSucesso!`);
  console.log(`- Pedido "${order.id}" marcado como APPROVED.`);
  console.log(`- Matrícula "${enrollment.id}" ativada para o aluno "${order.student.name}".`);
  console.log(`- O aluno agora tem acesso ao curso "${order.course.title}" na sua área de aluno.`);
}

main()
  .catch((err) => {
    console.error('Erro ao executar sincronização:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
