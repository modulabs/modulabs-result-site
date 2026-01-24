import { NextRequest, NextResponse } from 'next/server';
import { updateProjectMetadata } from '@/lib/projects';
import { revalidatePath } from 'next/cache';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { published, type } = body;

        // Validate published if present
        if (published !== undefined && typeof published !== 'boolean') {
            return NextResponse.json(
                { error: 'published field must be a boolean' },
                { status: 400 }
            );
        }

        // Validate type if present
        if (type !== undefined && !['github', 'paper', 'video'].includes(type)) {
            return NextResponse.json(
                { error: 'type field must be one of: github, paper, video' },
                { status: 400 }
            );
        }

        const success = await updateProjectMetadata(id, {
            ...(published !== undefined && { published }),
            ...(type !== undefined && { type })
        });

        if (!success) {
            return NextResponse.json(
                { error: '프로젝트를 찾을 수 없거나 업데이트에 실패했습니다.' },
                { status: 404 }
            );
        }

        // Revalidate paths to reflect changes immediately
        revalidatePath('/');
        revalidatePath('/admin');
        revalidatePath(`/projects/${id}`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating project:', error);
        return NextResponse.json(
            { error: '프로젝트 업데이트 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
