interface Env {
  FORMS_KEY: string;
  FORM_BACKEND_URI: string;
  TURNSTILE_SECRET_KEY: string;
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

    const contactFormData = new FormData();
    contactFormData.append("access_key", context.env.FORMS_KEY);
    contactFormData.append("name", name);
    contactFormData.append("email", email);
    contactFormData.append("message", message);

    const contactFormbody = JSON.stringify(Object.fromEntries(contactFormData));

    const response = await fetch(context.env.FORM_BACKEND_URI, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: contactFormbody,
    });

    const result = (await response.json()) as any;
    console.log("form data sent with status ", response.status, result);

    const isFormSuccess = response.status === 200 && result?.success === true;
    return new Response(
      JSON.stringify({
        success: isFormSuccess,
        message: isFormSuccess ? FORM_SUCCESS_MSG : FORM_FAIL_MSG,
      }),
      {
        status: response.status,
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
