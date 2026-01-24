import { NextResponse } from 'next/server';
import { getAllProjectsForAdmin } from '@/lib/projects';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const projects = await getAllProjectsForAdmin();
        return NextResponse.json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        return NextResponse.json(
            { error: '프로젝트 목록을 불러오는데 실패했습니다.' },
            { status: 500 }
        );
    }
}
