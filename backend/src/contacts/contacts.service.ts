import { Injectable, NotFoundException } from '@nestjs/common';
import { ContactStatus, ContactType, Prisma } from '@prisma/client';
import { paginated, pageArgs } from '../common/utils/paginate';
import { MailService } from '../mail/mail.service';
import { templates } from '../mail/templates';
import { PrismaService } from '../prisma/prisma.service';
import { ListContactsQueryDto, SubmitContactDto } from './dto/contact.dto';

@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async submit(dto: SubmitContactDto) {
    // Honeypot preenchido = bot; finge sucesso sem gravar.
    if (dto.website) return { ok: true };

    const data = { ...dto };
    delete data.website; // campo honeypot não é persistido
    const type = data.type ?? ContactType.GENERAL;
    const contact = await this.prisma.contactRequest.create({
      data: { ...data, type },
    });

    const isBudget = type === ContactType.BUDGET;
    void this.mail.send({
      to: contact.email,
      subject: isBudget
        ? 'Recebemos o seu pedido de orçamento — PicPlus'
        : 'Recebemos a sua mensagem — PicPlus',
      html: templates.contactReceived(contact.name, isBudget),
    });
    void this.mail.send({
      to: this.mail.adminRecipients,
      subject: `${isBudget ? 'Novo orçamento' : 'Novo contato'}: ${contact.name}`,
      replyTo: contact.email,
      html: templates.adminNewContact(contact),
    });

    return { ok: true };
  }

  async listAdmin(query: ListContactsQueryDto) {
    const where: Prisma.ContactRequestWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { company: { contains: query.search, mode: 'insensitive' } },
              { message: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.contactRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...pageArgs(query.page, query.limit),
      }),
      this.prisma.contactRequest.count({ where }),
    ]);
    return paginated(items, total, query.page, query.limit);
  }

  async updateStatus(id: string, status: ContactStatus) {
    await this.findOne(id);
    return this.prisma.contactRequest.update({
      where: { id },
      data: { status },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.contactRequest.delete({ where: { id } });
    return { ok: true };
  }

  private async findOne(id: string) {
    const contact = await this.prisma.contactRequest.findUnique({
      where: { id },
    });
    if (!contact) throw new NotFoundException('Contato não encontrado.');
    return contact;
  }
}
