import mailchimpTransactional from "@mailchimp/mailchimp_transactional"

const mailchimp = mailchimpTransactional(process.env.MAILCHIMP_API_KEY || "")

const FROM_EMAIL = process.env.MAILCHIMP_FROM_EMAIL || process.env.FROM_EMAIL || "ISP Library <hello@yourdomain.com>"

/**
 * Send a password reset email with the reset link
 */
export async function sendPasswordResetEmail(
    to: string,
    resetUrl: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await (mailchimp.messages.send as any)({
            message: {
                from_email: FROM_EMAIL,
                subject: "Reset Your Password — ISP Library",
                html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
                    <h2 style="color: #18181b; margin-bottom: 10px;">Password Reset Request</h2>
                    <h3 style="color: #C7005C; margin-bottom: 16px;">ISP Library</h3>
                    <p style="color: #52525b; line-height: 1.6; margin-bottom: 24px;">
                        We received a request to reset your password for your ISP Library account. 
                        Click the button below to set a new password.
                    </p>
                    <a href="${resetUrl}" 
                       style="display: inline-block; background-color: #18181b; color: #ffffff; 
                               padding: 12px 32px; border-radius: 8px; text-decoration: none; 
                               font-weight: 600; font-size: 14px; cursor: pointer;">
                        Reset Password
                    </a>
                    <p style="color: #a1a1aa; font-size: 13px; margin-top: 24px; line-height: 1.5;">
                        This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.
                    </p>
                </div>
            `,
                to: [
                    {
                        email: to,
                        type: "to"
                    }
                ]
            }
        })

        // Mailchimp returns an array of results
        const result = Array.isArray(response) ? response[0] : response

        if (result.status === "rejected" || result.status === "invalid") {
            console.error("Mailchimp error:", result.reject_reason || "Invalid recipient")
            return { success: false, error: result.reject_reason || "Invalid recipient" }
        }

        return { success: true }
    } catch (error: any) {
        console.error("Email send error:", error)
        return { success: false, error: error.message || "Failed to send email" }
    }
}
