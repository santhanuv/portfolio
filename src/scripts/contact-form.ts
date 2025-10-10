const contactForm = document.getElementById("contact-form") as HTMLFormElement;
const formSubmitBtn = document.getElementById(
  "form-submit-button",
) as HTMLButtonElement;
const toast = document.getElementById("toast") as HTMLDivElement;
const toastContent = document.getElementById("toast-content") as HTMLDivElement;
const toastSuccessIcon = document.getElementById(
  "toast-success-icon",
) as HTMLDivElement;
const toastFailIcon = document.getElementById(
  "toast-fail-icon",
) as HTMLDivElement;

if (contactForm) {
  contactForm.reset();
  contactForm.addEventListener("submit", handleFormSubmission);
}

async function handleFormSubmission(e: SubmitEvent) {
  e.preventDefault();

  formSubmitBtn.disabled = true;

  const formData = new FormData(contactForm);
  try {
    const response = await fetch("/contact", {
      method: "POST",
      body: formData,
    });

    const result = (await response.json()) as {
      success: boolean;
      message: string;
    };

    showToast(result.message, result.success);

    if (result.success) {
      contactForm.reset();
    }
  } catch (err) {
    showToast(
      "Unable to send notification. Please connect using LinkedIn",
      false,
    );
  } finally {
    formSubmitBtn.disabled = false;
  }
}

function showToast(message: string, success = true) {
  if (!toast || !toastContent) {
    return;
  }
  toastSuccessIcon.classList.add("hidden");
  toastFailIcon.classList.add("hidden");
  toast.classList.add("hidden");
  toast.classList.remove("toast-success", "toast-fail");

  toastContent.textContent = message;

  if (success) {
    toastSuccessIcon.classList.remove("hidden");
    toast.classList.add("toast-success");
    toast.classList.remove("hidden");

    setTimeout(() => {
      toast.classList.add("hidden");
    }, 5000);
  } else {
    toastFailIcon.classList.remove("hidden");
    toast.classList.add("toast-fail");
    toast.classList.remove("hidden");

    setTimeout(() => {
      toast.classList.add("hidden");
    }, 5000);
  }
}

function enableFormSubmitBtn() {
  if (!formSubmitBtn) return;

  formSubmitBtn.disabled = false;
}
