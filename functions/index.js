const functions = require('firebase-functions');

// ملاحظة: تأكد من تغيير هذه الروابط لتتطابق مع الـ Webhook URLs من n8n الخاصة بك
const N8N_WEBHOOK_URLS = {
  LEAD_CREATED: "https://your-n8n-url.com/webhook/new-lead",
  DEAL_UPDATED: "https://your-n8n-url.com/webhook/update-deal",
  CONTACT_CREATED: "https://your-n8n-url.com/webhook/new-contact"
};

/**
 * 1. عند إنشاء Lead جديد
 * يستهدف مجموعة "leads"
 */
exports.onLeadCreated = functions.firestore
  .document('leads/{leadId}')
  .onCreate(async (snap, context) => {
    const leadData = snap.data();
    const leadId = context.params.leadId;

    const payload = {
      event: "NEW_LEAD",
      timestamp: new Date().toISOString(),
      data: {
        id: leadId,
        ...leadData
      }
    };

    try {
      await fetch(N8N_WEBHOOK_URLS.LEAD_CREATED, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log('Lead sent to n8n successfully:', leadId);
    } catch (error) {
      console.error('Error sending lead to n8n:', error);
    }
});

/**
 * 2. عند تحديث Deal
 * يستهدف مجموعة "deals"
 */
exports.onDealUpdated = functions.firestore
  .document('deals/{dealId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const dealId = context.params.dealId;

    const payload = {
      event: "UPDATE_DEAL",
      timestamp: new Date().toISOString(),
      data: {
        id: dealId,
        before: beforeData,
        after: afterData
      }
    };

    try {
      await fetch(N8N_WEBHOOK_URLS.DEAL_UPDATED, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log('Deal update sent to n8n successfully:', dealId);
    } catch (error) {
      console.error('Error sending deal update to n8n:', error);
    }
});

/**
 * 3. عند إضافة Contact
 * يستهدف مجموعة "contacts"
 */
exports.onContactCreated = functions.firestore
  .document('contacts/{contactId}')
  .onCreate(async (snap, context) => {
    const contactData = snap.data();
    const contactId = context.params.contactId;

    const payload = {
      event: "NEW_CONTACT",
      timestamp: new Date().toISOString(),
      data: {
        id: contactId,
        ...contactData
      }
    };

    try {
      await fetch(N8N_WEBHOOK_URLS.CONTACT_CREATED, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log('Contact sent to n8n successfully:', contactId);
    } catch (error) {
      console.error('Error sending contact to n8n:', error);
    }
});
