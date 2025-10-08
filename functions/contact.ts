import { Resend } from "resend";

interface Env {
  FORMS_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  RECIPIENT_EMAIL_ADDR: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FORM_FAIL_MSG =
  "Sorry, message couldn’t be sent. Please reach me via LinkedIn. Thanks!";
const FORM_SUCCESS_MSG = "Message sent successfully!";
const TURNSTILE_VERIFY_URI =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const onRequest: PagesFunction<Env> = async (context) => {
  try {
    const formData = await context.request.formData();

    const name = formData.get("name")?.toString() ?? "";
    const email = formData.get("email")?.toString() ?? "";
    const message = formData.get("message")?.toString() ?? "";
    const turnstileToken =
      formData.get("cf-turnstile-response")?.toString() ?? "";

    const err = validateFormData(name, email, message);
    if (err !== null) {
      return new Response(
        JSON.stringify({
          success: false,
          message: err,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate Turnstile token
    if (!turnstileToken) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Please complete the verification",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Verify Turnstile token with Cloudflare
    const turnstileSecret = context.env.TURNSTILE_SECRET_KEY;
    const ip = context.request.headers.get("CF-Connecting-IP") ?? "";

    const turnstileVerified = await validateTurnstile(
      turnstileToken,
      turnstileSecret,
      ip,
    );

    if (!turnstileVerified) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Verification failed. Please try again.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    console.log("completed turnstile verification");

    if (!context.env.RECIPIENT_EMAIL_ADDR) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            "Contact form is not supported right now. Please connect through LinkedIn",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const resend = new Resend(context.env.FORMS_KEY);

    const { data, error } = await resend.emails.send({
      from: "Portfolio santhanu-vinod.pages.dev",
      to: [context.env.RECIPIENT_EMAIL_ADDR],
      subject: "Notification from portfolio",
      html: generateMailHtml(name, email, message),
    });
    const isFormSubSuccess = error === null;

    if (isFormSubSuccess) {
      console.log(`mail notification send with id: '${data?.id}'`);
    } else {
      console.log(
        `failed to send mail notification: error name: '${error.name}' with error message: '${error.message}'`,
      );
    }

    return new Response(
      JSON.stringify({
        success: isFormSubSuccess,
        message: isFormSubSuccess ? FORM_SUCCESS_MSG : FORM_FAIL_MSG,
      }),
      {
        status: isFormSubSuccess ? 200 : 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("failed to process formdata: ", e);
    return new Response(
      JSON.stringify({
        success: false,
        message: FORM_FAIL_MSG,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};

function validateFormData(
  name: string,
  email: string,
  message: string,
): string | null {
  if (!name) {
    return "Please enter your name";
  }

  if (!email) {
    return "Please enter your email";
  }

  if (!message) {
    return "Please enter a message";
  }

  if (!EMAIL_REGEX.test(email.trim())) {
    return "Please enter a valid email address";
  }

  return null;
}

async function validateTurnstile(
  token: string,
  secretKey: string,
  remoteip: string,
): Promise<boolean> {
  const formData = new FormData();
  formData.append("secret", secretKey);
  formData.append("response", token);
  formData.append("remoteip", remoteip);

  try {
    const response = await fetch(TURNSTILE_VERIFY_URI, {
      method: "POST",
      body: formData,
    });

    if (response.status !== 200) return false;
    var result = (await response.json()) as any;

    return result?.success === true;
  } catch (error) {
    console.error("Turnstile validation error:", error);
    return false;
  }
}

function generateMailHtml(
  name: string,
  contactEmail: string,
  message: string,
): string {
  return `<div>
    <p>Hi,</p>
    <p>A new form submission from portfolio. Details below:</p>
    <h3>Name: </h3><br /><p>${name}</p>
    <h3>Email: </h3><br /><p>${contactEmail}</p>
    <h3>Message: </h3><br /><p>${message}</p>
  </div>`;
}
