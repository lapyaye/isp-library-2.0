import mailchimpTransactional from "@mailchimp/mailchimp_transactional"

const mailchimp = mailchimpTransactional(process.env.MAILCHIMP_API_KEY || "")
const FROM_EMAIL = process.env.NODE_ENV === 'production'
    ? process.env.MAILCHIMP_FROM_EMAIL : "library@ispmyanmar.com"

const FROM_NAME = process.env.NODE_ENV === 'production'
    ? process.env.MAILCHIMP_FROM_NAME : "ISP Library"

export async function sendPasswordResetEmail(
    to: string,
    resetUrl: string
): Promise<{ success: boolean; error?: string }> {

    try {
        const response = await mailchimp.messages.send({
            message: {
                from_email: FROM_EMAIL,
                from_name: FROM_NAME,
                subject: "Reset Your Password — ISP Library",
                html: `
                ${process.env.NODE_ENV !== 'production' ? `
                <div style="background: #fef3c7; padding: 12px; margin-bottom: 16px; border-radius: 8px;">
                    <strong>TEST MODE</strong><br>
                    This email was intended for: ${to}
                </div>
                ` : ''}
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

        const result = Array.isArray(response) ? response[0] : response

        if (result.status === "sent" || result.status === "queued") {
            return { success: true }
        }

        if (result.status === "rejected" || result.status === "invalid") {
            console.error("❌ Email rejected:", result.reject_reason)
            return { success: false, error: result.reject_reason || "Email rejected" }
        }

        return { success: true }

    } catch (error: any) {
        console.error("❌ Error:", error.response?.data || error.message)
        return {
            success: false,
            error: error.response?.data?.message || error.message || "Failed to send email"
        }
    }
}

export async function sendConfirmationMail(
    to: string,
    confirmationUrl: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await mailchimp.messages.send({
            message: {
                from_email: FROM_EMAIL,
                from_name: FROM_NAME,
                subject: "Confirm Your Email — ISP Library",
                html: `
                ${process.env.NODE_ENV !== 'production' ? `
                <div style="background: #fef3c7; padding: 12px; margin-bottom: 16px; border-radius: 8px;">
                    <strong>TEST MODE</strong><br>
                    This email was intended for: ${to}
                </div>
                ` : ''}
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
                    <h2 style="color: #18181b; margin-bottom: 10px;">Confirm Your Email</h2>
                    <h3 style="color: #C7005C; margin-bottom: 16px;">ISP Library</h3>
                    <p style="color: #52525b; line-height: 1.6; margin-bottom: 24px;">
                        Thank you for registering for an account with ISP Library. 
                        Click the button below to confirm your email address and complete your registration.
                    </p>
                    <a href="${confirmationUrl}" 
                       style="display: inline-block; background-color: #18181b; color: #ffffff; 
                               padding: 12px 32px; border-radius: 8px; text-decoration: none; 
                               font-weight: 600; font-size: 14px; cursor: pointer;">
                        Confirm Email
                    </a>
                    <p style="color: #a1a1aa; font-size: 13px; margin-top: 24px; line-height: 1.5;">
                        This link expires in 15 minutes. If you didn't create this account, you can safely ignore this email.
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

        const result = Array.isArray(response) ? response[0] : response

        if (result.status === "sent" || result.status === "queued") {
            return { success: true }
        }

        if (result.status === "rejected" || result.status === "invalid") {
            console.error("❌ Email rejected:", result.reject_reason)
            return { success: false, error: result.reject_reason || "Email rejected" }
        }

        return { success: true }

    } catch (error: any) {
        console.error("❌ Error:", error.response?.data || error.message)
        return {
            success: false,
            error: error.response?.data?.message || error.message || "Failed to send email"
        }
    }
}