import { Octokit } from '@octokit/rest';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { cacheRepositoryData, getCachedRepositoryData, cacheFileData, getCachedFileData } from './firebaseService';

// Initialize Octokit without authentication for public access
const octokit = new Octokit();

// Initialize Google Generative AI with your API key
// Note: In production, use environment variables for API keys
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// Helper function to analyze code using Gemini
async function analyzeCodeWithGemini(code, functionName, filePath) {
    try {
        // Skip analysis for empty code
        if (!code || !functionName) {
            throw new Error('Invalid code or function name provided');
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        
        const prompt = `Analyze this code and provide a detailed JSON response with exactly these fields and nothing else:${code}

Response format:
{
  "description": "Detailed explanation of what the function does, its role in the codebase, and any notable patterns or practices it implements",
  "type": "One word: Component/Utility/Service/Hook/Controller",
  "parameterDescriptions": ["Detailed description of each parameter, its purpose, and expected values"],
  "returnDescription": "Comprehensive description of the return value, its structure, and usage",
  "codePatterns": ["List of design patterns, architectural patterns, or coding practices used"],
  "dependencies": {
    "external": ["External dependencies and their purpose"],
    "internal": ["Internal function calls and their relationships"]
  },
  "securityConsiderations": "Any security implications or best practices to consider",
  "performanceConsiderations": "Performance implications and optimization opportunities",
  "testingGuidelines": "Suggestions for testing this function effectively"
}
`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Strict JSON extraction
        const jsonMatch = text.match(/\{[\s\S]*\}/);  // Match everything between first { and last }
        const cleanedText = jsonMatch ? jsonMatch[0].trim() : '{}';
        
        let analysis;
        try {
            analysis = JSON.parse(cleanedText);
            
            // Enforce strict schema
            if (typeof analysis.description !== 'string') analysis.description = `Analysis of ${functionName}`;
            if (typeof analysis.type !== 'string') analysis.type = 'Unknown';
            if (!Array.isArray(analysis.parameterDescriptions)) analysis.parameterDescriptions = [];
            if (typeof analysis.returnDescription !== 'string') analysis.returnDescription = 'Unknown return value';
            
            return analysis;
        } catch (parseError) {
            console.error('Error parsing Gemini response:', parseError);
            return {
                description: `Analysis of ${functionName}`,
                type: 'Unknown',
                parameterDescriptions: [],
                returnDescription: 'Analysis failed'
            };
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
        // Check cache first
        const cachedData = await getCachedRepositoryData(owner, repo);
        if (cachedData && cachedData.data) {
            console.log('Using cached repository data');
            return cachedData.data;
        }

        console.log('Fetching fresh repository data');
        const { data: tree } = await octokit.git.getTree({
            owner,
            repo,
            tree_sha: 'main',
            recursive: true
        });

        const mappedData = tree.tree.map(item => ({
            name: item.path.split('/').pop(),
            path: item.path,
            type: item.type,
            children: []
        }));

        // Cache the results
        await cacheRepositoryData(owner, repo, mappedData);
        return mappedData;
    } catch (error) {
        console.error('Error fetching repository files:', error);
        throw error;
    }
};

export const fetchFileContent = async (owner, repo, path) => {
    try {
        // Check cache first
        const cachedFile = await getCachedFileData(owner, repo, path);
        if (cachedFile && cachedFile.content) {
            console.log('Using cached file data');
            return {
                name: path.split('/').pop(),
                content: cachedFile.content,
                path,
                sha: cachedFile.sha
            };
        }

        console.log('Fetching fresh file content');
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

            const fileData = {
                name: path.split('/').pop(),
                content,
                path,
                size: data.size,
                sha: data.sha
            };

            // Cache the file content
            await cacheFileData(owner, repo, path, content, null, []);
            return fileData;
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