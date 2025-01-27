import { Octokit } from '@octokit/rest';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Octokit without authentication for public access
const octokit = new Octokit();

// Initialize Google Generative AI with your API key
// Note: In production, use environment variables for API keys
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// Helper function to analyze code using Gemini
async function analyzeCodeWithGemini(code, functionName) {
    try {
        // Skip analysis for empty code
        if (!code || !functionName) {
            throw new Error('Invalid code or function name provided');
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        
        const prompt = `Analyze this JavaScript/TypeScript function or class named '${functionName}':\n\n${code}\n\nProvide a detailed analysis in this exact JSON format (no markdown):\n{\n  "description": "Comprehensive description of the function's purpose and behavior",\n  "type": "Type of the function (e.g., API endpoint, database operation, utility function)",\n  "parameterDescriptions": [{"name": "paramName", "description": "detailed parameter description", "type": "parameter type if specified"}],\n  "returnDescription": "What the function returns, including possible return types and conditions",\n  "securityConsiderations": "Any security measures implemented (e.g., authentication, input validation)",\n  "asyncBehavior": "Description of asynchronous operations if present",\n  "dependencies": "External services or libraries used",\n  "errorHandling": "How errors are handled and logged"\n}`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Clean up the response text to ensure valid JSON
        const cleanedText = text.replace(/```(json)?|```/g, '').trim();
        
        let analysis;
        try {
            analysis = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error('Error parsing Gemini response:', parseError, '\nResponse text:', cleanedText);
            throw new Error('Failed to parse AI analysis response');
        }

        // Validate analysis structure and provide defaults if needed
        return {
            description: analysis.description || `Analysis of ${functionName}`,
            parameterDescriptions: Array.isArray(analysis.parameterDescriptions) ? analysis.parameterDescriptions : [],
            returnDescription: analysis.returnDescription || 'No return value description available'
        };
    } catch (error) {
        console.error('Error analyzing code with Gemini:', error);
        return {
            description: `Unable to analyze code: ${error.message}`,
            parameterDescriptions: [],
            returnDescription: 'Analysis failed'
        };
    }
}

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

        if (Array.isArray(data)) {
            throw new Error('Path points to a directory, not a file');
        }

        if (!data.content) {
            throw new Error('No content available for this file');
        }

        try {
            // Remove any whitespace or newlines from base64 string
            const cleanContent = data.content.replace(/\s/g, '');
            const content = decodeURIComponent(escape(atob(cleanContent)));
            
            if (!content) {
                throw new Error('Decoded content is empty');
            }

            return {
                name: path.split('/').pop(),
                content,
                path,
                size: data.size,
                sha: data.sha
            };
        } catch (decodeError) {
            console.error('Base64 decoding error:', decodeError);
            throw new Error(`Failed to decode file content: ${decodeError.message}. Content might be corrupted or not properly base64 encoded.`);
        }
    } catch (error) {
        if (error.status === 404) {
            throw new Error('File not found');
        } else if (error.status === 403) {
            throw new Error('Access denied. Repository might be private or rate limit exceeded');
        }
        throw new Error('Failed to fetch file content: ' + error.message);
    }
};

export { analyzeCodeWithGemini };