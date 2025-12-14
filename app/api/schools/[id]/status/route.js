import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function PUT(req, { params }) {
    try {
        console.log("=== SCHOOL STATUS UPDATE REQUEST ===");
        const session = await getServerSession(authOptions);
        console.log("Session user role:", session?.user?.role);
        
        if (!session || session.user.role !== 'SUPER_ADMIN') {
            console.error("❌ Unauthorized - User is not SUPER_ADMIN");
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // Await params for Next.js 15+
        const { id } = await params;
        const { status } = await req.json();
        console.log("School ID:", id, "New status:", status);

        if (!['PENDING', 'APPROVED', 'REJECTED', 'SUBSCRIBED', 'UNSUBSCRIBED'].includes(status)) {
            console.error("❌ Invalid status:", status);
            return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
        }

        await connectDB();
        console.log("Updating school document...");
        
        const user = await User.findByIdAndUpdate(id, { status }, { new: true });

        if (!user) {
            console.error("❌ School not found with ID:", id);
            return NextResponse.json({ message: 'School not found' }, { status: 404 });
        }

        console.log("✓ School updated successfully:", user._id, "New status:", user.status);
        return NextResponse.json({ message: 'Status updated', user }, { status: 200 });
    } catch (error) {
        console.error('❌ Error updating status:', error.message);
        return NextResponse.json({ message: 'Error updating status', error: error.message }, { status: 500 });
    }
}
