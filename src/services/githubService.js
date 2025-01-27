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
        
        const prompt = `As an experienced software engineer analyzing this code, provide insights about the ${functionName} in ${filePath}. Consider:

1. Code Purpose & Implementation:
- What's the core functionality and architectural role?
- How does it handle edge cases and errors?
- Are there any potential performance considerations?

2. Code Quality & Best Practices:
- How well does it follow SOLID principles?
- What design patterns are implemented?
- Is the code maintainable and testable?

3. Technical Dependencies & Flow:
- What external services or modules does it rely on?
- How does data flow through the function?
- Are there any critical async operations?

Analyze the following code and share your expert insights:

${code}

Provide a detailed analysis in this exact JSON format (no markdown):
{
  "description": "A comprehensive explanation of the function's purpose, implementation approach, and architectural significance",
  "type": "Architectural classification (e.g., Controller, Service, Utility, Hook, HOC)",
  "parameterDescriptions": [{
    "name": "paramName",
    "description": "Parameter's role and impact on function behavior",
    "type": "Expected data type and structure",
    "validation": "Any validation or constraints"
  }],
  "returnDescription": "Detailed explanation of return value, including type guarantees and possible states",
  "securityConsiderations": "Security implications, input validation, and protective measures",
  "asyncBehavior": "Async flow, error boundaries, and state management",
  "dependencies": {
    "imports": ["Required modules and their purpose"],
    "internalCalls": ["Internal function calls and their significance"],
    "externalCalls": ["External service calls and their impact"]
  },
  "errorHandling": "Error management strategy and recovery mechanisms",
  "performanceConsiderations": "Runtime complexity and optimization opportunities",
  "maintainabilityNotes": "Code organization and potential refactoring suggestions"
}`;
        
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