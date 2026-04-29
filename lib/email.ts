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
                        style="display: inline-block; 
                                background-color: #18181b; 
                                color: #ffffff; 
                                padding: 12px 32px; 
                                border-radius: 8px; 
                                text-decoration: none; 
                                font-weight: 600; 
                                font-size: 14px; 
                                cursor: pointer;">
                        Confirm Email
                    </a>
                    <p style="color: #a1a1aa; font-size: 13px; margin-top: 24px; line-height: 1.5;">
                        This link expires in 15 minutes. If you didn't create this account, you can safely ignore this email.
                    </p>
                    <p style="font-size: 11px; color: #a1a1aa;">
                        If the button doesn't work, paste this into your browser: <br>
                        ${confirmationUrl}
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

export async function sendWelcomeEmail(to: string, username: string) {
    try {
        const response = await mailchimp.messages.send({
            message: {
                from_email: FROM_EMAIL,
                from_name: FROM_NAME,
                subject: "Welcome to ISP Library",
                html: `
                ${process.env.NODE_ENV !== 'production' ? `
                <div style="background: #fef3c7; padding: 12px; margin-bottom: 16px; border-radius: 8px;">
                    <strong>TEST MODE</strong><br>
                    This email was intended for: ${to}
                </div>
                ` : ''}
                <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; background-color: #ffffff; color: #18181b;">
                    <div style="border-bottom: 2px solid #f4f4f5; padding-bottom: 24px; margin-bottom: 32px;">
                        <h3 style="color: #C7005C; margin: 0; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; font-weight: 700;">ISP Library</h3>
                        <h2 style="color: #18181b; margin: 8px 0 0 0; font-size: 28px; font-weight: 800; line-height: 1.2;">Welcome to our Digital Library</h2>
                    </div>
                    <div style="margin-bottom: 32px;">
                        <p style="font-size: 16px; color: #18181b; font-weight: 600; margin-bottom: 12px;">Hi ${username.toUpperCase()},</p>
                        <p style="color: #52525b; line-height: 1.6; font-size: 15px; margin: 0;">
                            Your account has been successfully created. Thank you for joining <strong>ISP Library</strong>. You now have full access to our digital and physical collections.
                        </p>
                    </div>

                    <div style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
                        <h4 style="color: #18181b; margin: 0 0 16px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e4e4e7; padding-bottom: 8px;">Library Rules & Regulations</h4>
                        
                        <div style="margin-bottom: 16px;">
                            <p style="margin: 0 0 4px 0; font-weight: 700; font-size: 14px; color: #18181b;">1. Borrow Period</p>
                            <p style="margin: 0; font-size: 14px; color: #52525b; line-height: 1.5;">Maximum borrow period is two (2) weeks (14 days).</p>
                        </div>

                        <div style="margin-bottom: 16px;">
                            <p style="margin: 0 0 4px 0; font-weight: 700; font-size: 14px; color: #18181b;">2. Renewal</p>
                            <p style="margin: 0; font-size: 14px; color: #52525b; line-height: 1.5;">One-time extension of 14 days is permitted if no other user has requested the book. Submit requests prior to the original due date.</p>
                        </div>

                        <div style="margin-bottom: 16px;">
                            <p style="margin: 0 0 4px 0; font-weight: 700; font-size: 14px; color: #18181b;">3. Book Care & Responsibility</p>
                            <p style="margin: 0; font-size: 14px; color: #52525b; line-height: 1.5;">Writing, highlighting, or folding pages is prohibited. In the event of loss or damage, the borrower is required to provide a replacement.</p>
                        </div>

                        <div style="margin: 0;">
                            <p style="margin: 0 0 4px 0; font-weight: 700; font-size: 14px; color: #18181b;">4. Return Policy</p>
                            <p style="margin: 0; font-size: 14px; color: #52525b; line-height: 1.5;">Books must be returned by the due date to the designated return location only.</p>
                        </div>
                    </div>

                    <div style="border-top: 1px solid #f4f4f5; padding-top: 24px;">
                        <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                            If you have any questions regarding your membership or need assistance with our resources, please contact our support team.
                        </p>
                        <p style="color: #18181b; font-size: 15px; font-weight: 600; line-height: 1.2; margin: 0;">
                            Best regards,<br>
                            <span style="color: #C7005C;">ISP Library Team</span>
                        </p>
                    </div>
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