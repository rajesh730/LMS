import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function ensureDefaultAdmin() {
    try {
        const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@egrantha.com';
        const existingAdmin = await User.findOne({ email: adminEmail });

        if (!existingAdmin) {
            console.log('Creating Default Super Admin...');
            const hashedPassword = await bcrypt.hash(
                process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
                10
            );

            await User.create({
                email: adminEmail,
                password: hashedPassword,
                role: 'SUPER_ADMIN',
                isDefaultAdmin: true,
                status: 'APPROVED', // Ensure admin is approved
            });
            console.log('Default Super Admin created successfully.');
        } else if (existingAdmin.status !== 'APPROVED') {
            console.log('Updating Default Super Admin status to APPROVED...');
            existingAdmin.status = 'APPROVED';
            await existingAdmin.save();
            console.log('Default Super Admin status updated.');
        }
    } catch (error) {
        console.error('Error seeding default admin:', error);
    }
}
