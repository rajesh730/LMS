import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { publishWorkIndicatorsUpdate } from '@/lib/workIndicatorRealtime';
import { sendSchoolApprovalEmail } from '@/lib/emailService';

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
        
        const previous = await User.findById(id).select('status email schoolName').lean();
        if (!previous) {
            console.error("❌ School not found with ID:", id);
            return NextResponse.json({ message: 'School not found' }, { status: 404 });
        }

        const user = await User.findByIdAndUpdate(id, { status }, { new: true });

        // Welcome email only when the school newly gains access; failures are
        // logged inside sendSchoolApprovalEmail and never block the update.
        const hadAccess = ['APPROVED', 'SUBSCRIBED'].includes(previous.status);
        const hasAccess = ['APPROVED', 'SUBSCRIBED'].includes(status);
        if (!hadAccess && hasAccess && previous.email) {
            sendSchoolApprovalEmail(previous.email, previous.schoolName || 'Your school');
        }

        console.log("School updated successfully:", user._id, "New status:", user.status);
        publishWorkIndicatorsUpdate("school-status-updated", {
            schoolId: String(user._id),
            status: user.status,
        });
        return NextResponse.json({ message: 'Status updated', user }, { status: 200 });
    } catch (error) {
        console.error('❌ Error updating status:', error.message);
        return NextResponse.json({ message: 'Error updating status', error: error.message }, { status: 500 });
    }
}
