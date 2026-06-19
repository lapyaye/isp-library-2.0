import { prisma, pool } from "../lib/prisma"
import * as bcrypt from "bcryptjs"

const admin_info = [{
    username: "[USERNAME]",
    email: "[EMAIL_ADDRESS]",
    password: "[PASSWORD]",
}]

async function seed({ username, email, password }: { username: string, email: string, password: string }) {
    console.log("🌱 Starting database seed...")

    // ─── Users ──────────────────────────────────────────
    const adminPassword = await bcrypt.hash(password, 10)

    const admin = await prisma.user.upsert({
        where: { email: email },
        update: {},
        create: {
            username: username,
            email: email,
            password: adminPassword,
            is_admin: true,
            is_verified: true,
        },
    })
    console.log(`  ✔ Admin user created: ${admin.email}`)
}

async function main() {
    for (const admin of admin_info) {
        await seed(admin)
    }
}

main()
    .catch((e) => {
        console.error("❌ Seeding failed:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
        await pool.end()
    })
