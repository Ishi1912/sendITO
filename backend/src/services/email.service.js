
const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
    secure: true,
    host: "smtp.gmail.com",
    port: 465,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// A permanent SMTP failure (5xx, e.g. mailbox does not exist) means the address is bad.
function isPermanentFailure(error) {
    const codes = [error && error.responseCode]
        .concat(((error && error.rejectedErrors) || []).map((r) => r.responseCode))
        .filter(Boolean);
    return codes.some((c) => c >= 550 && c <= 554);
}

function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// HTML copy of the e-mail with a visible Unsubscribe button at the bottom.
function buildHtml(content, unsubscribeUrl) {
    return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#222">
${escapeHtml(content).replace(/\n/g, "<br>")}
<hr style="border:none;border-top:1px solid #ddd;margin:28px 0 16px">
<p style="font-size:12px;color:#777;margin:0 0 10px">You are receiving this e-mail because you are on a subscriber list.</p>
<a href="${unsubscribeUrl}" style="display:inline-block;background:#6d5efc;color:#fff;text-decoration:none;padding:9px 18px;border-radius:6px;font-size:13px">Unsubscribe</a>
</div>`;
}

async function sendEmail(to, subject, content, attachments, unsubscribeUrl) {
    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: to,
            subject: subject,
            text: unsubscribeUrl
                ? `${content}\n\n--\nTo stop receiving these e-mails, unsubscribe here: ${unsubscribeUrl}`
                : content,
            html: unsubscribeUrl ? buildHtml(content, unsubscribeUrl) : undefined,
            headers: unsubscribeUrl
                ? { "List-Unsubscribe": `<${unsubscribeUrl}>` }
                : undefined,
            attachments:
                attachments && attachments.length > 0
                    ? attachments
                    : undefined,
        });

        // Check whether the SMTP server accepted the recipient.
        const accepted = (info.accepted || []).some(
            (email) =>
                String(email).toLowerCase() === String(to).toLowerCase()
        );

        if (!accepted) {
            const rejectionReason = (info.rejectedErrors || [])
                .map((error) => error.message)
                .filter(Boolean)
                .join("; ");

            const rejected = new Error(
                rejectionReason || `SMTP did not accept recipient: ${to}`
            );
            rejected.permanent = isPermanentFailure({ rejectedErrors: info.rejectedErrors });
            throw rejected;
        }

        console.log(`Email accepted by SMTP for: ${to}`);

        return {
            success: true,
            messageId: info.messageId,
            accepted: info.accepted,
            rejected: info.rejected,
        };

    } catch (error) {
        console.error(`Email sending failed for ${to}:`, error.message);
        if (error.permanent === undefined) error.permanent = isPermanentFailure(error);
        throw error;
    }
}

module.exports = { sendEmail };
