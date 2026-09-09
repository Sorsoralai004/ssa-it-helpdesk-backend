// Notification hooks — called whenever a ticket is created or its status
// changes. Sends a Web Push notification to every subscribed IT-staff
// browser, and an email to the IT team inbox. Both channels are optional:
// if VAPID keys or SMTP settings aren't configured, that channel just logs
// and skips instead of throwing.

const { sendPushToAll } = require('./push');
const { sendEmail } = require('./email');

async function notifyNewTicket(ticket) {
  console.log(`[notify] new ticket ${ticket.ticket_no} — ${ticket.category} (${ticket.urgency})`);

  const title = `แจ้งปัญหาใหม่ ${ticket.ticket_no}`;
  const body = `${ticket.category} · ความเร่งด่วน: ${ticket.urgency} · ${ticket.department}`;

  await sendPushToAll({
    title,
    body,
    url: `/it-helpdesk.html#${ticket.id}`,
  });

  await sendEmail(
    `[IT Helpdesk] ${title}`,
    [
      `ผู้แจ้ง: ${ticket.reporter_name}`,
      `แผนก/สถานที่: ${ticket.department}`,
      `หมวดหมู่: ${ticket.category}`,
      `ความเร่งด่วน: ${ticket.urgency}`,
      '',
      'รายละเอียด:',
      ticket.detail,
    ].join('\n')
  );
}

async function notifyStatusChange(ticket, oldStatus) {
  console.log(`[notify] ${ticket.ticket_no} status: ${oldStatus} -> ${ticket.status}`);

  const title = `${ticket.ticket_no} เปลี่ยนสถานะ`;
  const body = `${oldStatus} → ${ticket.status}`;

  await sendPushToAll({
    title,
    body,
    url: `/it-helpdesk.html#${ticket.id}`,
  });

  await sendEmail(
    `[IT Helpdesk] ${title}`,
    `Ticket: ${ticket.ticket_no}\nสถานะเดิม: ${oldStatus}\nสถานะใหม่: ${ticket.status}`
  );
}

module.exports = { notifyNewTicket, notifyStatusChange };
