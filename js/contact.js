import { renderHeader, renderFooter, showToast, isValidEmail, validateField } from "./common.js";
import { db, collection, addDoc, serverTimestamp } from "./firebase-config.js";
import { notifyCBM } from "./notification-client.js";

renderHeader("contact.html");
renderFooter();

document.getElementById("contact-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nameEl = document.getElementById("contact-name");
  const emailEl = document.getElementById("contact-email");
  const phoneEl = document.getElementById("contact-phone");
  const msgEl = document.getElementById("contact-message");
  const btn = document.getElementById("contact-submit");

  const okName = validateField(nameEl, nameEl.value.trim().length > 1, "Please enter your name.");
  const okEmail = validateField(emailEl, isValidEmail(emailEl.value), "Please enter a valid email address.");
  const okMsg = validateField(msgEl, msgEl.value.trim().length > 4, "Please enter a message.");
  if (!okName || !okEmail || !okMsg) return;

  btn.disabled = true;
  btn.textContent = "Sending…";
  try {
    const messageRef = await addDoc(collection(db, "contactMessages"), {
      name: nameEl.value.trim(),
      email: emailEl.value.trim(),
      phone: phoneEl.value.trim(),
      message: msgEl.value.trim(),
      status: "New",
      createdAt: serverTimestamp(),
    });

    // Save the message first. Email/push notification failure must not
    // make a successfully-submitted contact message look unsuccessful.
    try {
      await notifyCBM({ type: "contact.created", messageId: messageRef.id });
    } catch (notificationError) {
      console.warn("Message saved, but notification delivery failed:", notificationError);
    }

    showToast("Message sent — we'll get back to you shortly.", "success");
    e.target.reset();
  } catch (err) {
    console.error(err);
    showToast("We couldn't send your message. Please try again or reach us on WhatsApp.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Send Message";
  }
});
