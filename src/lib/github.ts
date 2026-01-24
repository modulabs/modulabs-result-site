export async function saveFileToGitHub(
    path: string,
    content: string,
    message: string
): Promise<boolean> {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';

    if (!token || !owner || !repo) {
        console.error('Missing GitHub configuration');
        return false;
    }

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    try {
        // 1. Check if file exists to get SHA
        const getRes = await fetch(apiUrl, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json',
            },
            cache: 'no-store' // Important for Vercel
        });

        let sha: string | undefined;
        if (getRes.ok) {
            const data = await getRes.json();
            sha = data.sha;
        }

        // 2. Create or Update file
        const putRes = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                content: Buffer.from(content).toString('base64'),
                sha,
                branch,
            }),
        });

        if (!putRes.ok) {
            const errorText = await putRes.text();
            console.error(`GitHub API Error: ${putRes.status} ${putRes.statusText}`, errorText);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error saving to GitHub:', error);
        return false;
    }
}
