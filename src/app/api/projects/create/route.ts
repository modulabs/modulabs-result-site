import { NextRequest, NextResponse } from 'next/server';
import { createProject } from '@/lib/projects';
import { revalidatePath } from 'next/cache';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function normalizeBaseUrl(value: string | undefined): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    try {
        const parsed = new URL(trimmed);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return null;
        }

        // Always use origin only so accidental path inputs
        // (e.g. https://foo.vercel.app/admin) do not break API routes.
        return parsed.origin;
    } catch {
        return null;
    }
}

async function proxyCreateRequest(
    baseUrl: string,
    payload: { id: string; content: string }
): Promise<NextResponse> {
    const targetUrl = `${baseUrl}/api/projects/create`;
    const proxyResponse = await fetch(targetUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-via-vercel-proxy': '1',
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
    });

    const rawText = await proxyResponse.text();
    let data: unknown = null;
    if (rawText) {
        try {
            data = JSON.parse(rawText);
        } catch {
            data = null;
        }
    }

    if (!proxyResponse.ok) {
        const remoteError =
            isRecord(data) && typeof data.error === 'string' && data.error.trim()
                ? data.error
                : `Vercel 게시 API 호출 실패 (HTTP ${proxyResponse.status})`;
        return NextResponse.json({ error: remoteError }, { status: proxyResponse.status });
    }

    if (isRecord(data)) {
        return NextResponse.json(data, { status: proxyResponse.status });
    }

    return NextResponse.json({ success: true }, { status: proxyResponse.status });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, content } = body;

        if (!id || !content) {
            return NextResponse.json(
                { error: 'Project ID and content are required' },
                { status: 400 }
            );
        }

        const configuredPublishBaseUrl = normalizeBaseUrl(
            process.env.VERCEL_PUBLISH_BASE_URL ?? process.env.NEXT_PUBLIC_VERCEL_PUBLISH_BASE_URL
        );
        const isVercelRuntime = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
        const currentOrigin = new URL(request.url).origin;
        const isProxyHop = request.headers.get('x-via-vercel-proxy') === '1';

        if (!isProxyHop && !isVercelRuntime) {
            if (!configuredPublishBaseUrl) {
                return NextResponse.json(
                    {
                        error:
                            'GitHub 게시는 Vercel 경유만 허용됩니다. .env.local에 VERCEL_PUBLISH_BASE_URL=https://<your-vercel-domain> 를 설정하세요.'
                    },
                    { status: 500 }
                );
            }

            if (configuredPublishBaseUrl !== currentOrigin) {
                return await proxyCreateRequest(configuredPublishBaseUrl, { id, content });
            }
        }

        const result = await createProject(id, content);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error ?? '프로젝트 생성에 실패했습니다.' },
                { status: 500 }
            );
        }

        // Revalidate paths to update lists
        revalidatePath('/');
        revalidatePath('/admin');

        return NextResponse.json({
            success: true,
            storage: result.storage,
            warning: result.warning,
        });
    } catch (error) {
        console.error('Error in create project API:', error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? `프로젝트 생성 중 오류가 발생했습니다: ${error.message}`
                        : '프로젝트 생성 중 오류가 발생했습니다.'
            },
            { status: 500 }
        );
    }
}
