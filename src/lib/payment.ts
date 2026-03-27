import type { PaymentPayload } from "@/types/domain";

export const submitInterswitchPayment = (payment: PaymentPayload): void => {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = payment.checkoutUrl;
  form.style.display = "none";

  Object.entries(payment.formFields).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  form.remove();
};
