import { Octokit } from '@octokit/rest';

// Initialize Octokit without authentication for public access
const octokit = new Octokit();

export const fetchRepositoryFiles = async (owner, repo) => {
    try {
        const { data: tree } = await octokit.git.getTree({
            owner,
            repo,
            tree_sha: 'main',
            recursive: true
        });

        return tree.tree.map(item => ({
            name: item.path.split('/').pop(),
            path: item.path,
            type: item.type,
            children: []
        }));
    } catch (error) {
        console.error('Error fetching repository files:', error);
        throw error;
    }
};

export const fetchFileContent = async (owner, repo, path) => {
    try {
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path
        });

        const content = Buffer.from(data.content, 'base64').toString();
        return {
            name: path.split('/').pop(),
            content,
            path
        };
    } catch (error) {
        console.error('Error fetching file content:', error);
        throw error;
    }
};