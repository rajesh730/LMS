import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import Event from '@/models/Event';

export async function POST(req, props) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const params = await props.params;
        const id = params.id;

        console.log(`[POST DELETE EVENT] Request received for ID: ${id}`);
        console.log(`[POST DELETE EVENT] User Role: ${session?.user?.role}`);

        await connectDB();

        const deletedEvent = await Event.findByIdAndDelete(id);

        if (!deletedEvent) {
            return NextResponse.json({ message: 'Event not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Event deleted via POST' }, { status: 200 });
    } catch (error) {
        console.error('Delete Event Error (POST):', error);
        return NextResponse.json({ message: 'Error deleting event: ' + error.message }, { status: 500 });
    }
}
