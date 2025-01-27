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
        
        const prompt = `Analyze this code and provide a detailed JSON response. Consider the following aspects:

1. Context: This code is from file '${filePath}'
2. Code to analyze:
${code}

Provide a comprehensive analysis in this exact JSON format:
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
  "testingGuidelines": "Suggestions for testing this function effectively",
  "complexity": {
    "cognitive": "Assessment of cognitive complexity",
    "cyclomaticComplexity": "Assessment of cyclomatic complexity"
  },
  "maintainability": "Assessment of code maintainability and suggestions for improvement",
  "bestPractices": ["List of followed or violated best practices"],
  "suggestedImprovements": ["Concrete suggestions for code improvements"]
}

IMPORTANT: 
1. Ensure all string values are properly escaped
2. Provide specific, actionable insights
3. Consider the broader codebase context
4. Focus on practical, implementable suggestions`;

        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Enhanced JSON extraction and cleaning
        const jsonMatch = text.match(/\{[\s\S]*\}/);  // Match everything between first { and last }
        let cleanedText = jsonMatch ? jsonMatch[0] : '{}';
        
        // Log the raw and cleaned text for debugging
        console.log('Raw Gemini response:', text);
        console.log('Cleaned text before parsing:', cleanedText);
        
        // Enhanced cleaning and validation steps
        cleanedText = cleanedText
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
            .replace(/\*\*/g, '') // Remove markdown bold syntax
            .replace(/`/g, '') // Remove backticks
            .replace(/\\[^"bfnrtu\/]/g, '') // Remove invalid escapes
            .replace(/(["[{,])(\s*)nan\s*([,}\]])/gi, '$1null$3') // Replace NaN with null
            .replace(/(["[{,])(\s*)undefined\s*([,}\]])/g, '$1null$3') // Replace undefined with null
            .replace(/(["[{,])(\s*)null\s*([,}\]])/gi, '$1null$3') // Normalize null values
            .replace(/(["[{,])(\s*)true\s*([,}\]])/gi, '$1true$3') // Normalize boolean values
            .replace(/(["[{,])(\s*)false\s*([,}\]])/g, '$1false$3')
            .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
            .replace(/\r?\n/g, '\\n') // Properly escape newlines
            .replace(/"/g, '\"') // Properly escape quotes
            .trim();

        // Validate JSON structure
        if (!cleanedText.startsWith('{') || !cleanedText.endsWith('}')) {
            throw new Error('Invalid JSON structure');
        }
        
        let analysis;
        try {
            // Wrap the cleaned text in a new object to ensure valid JSON
            const wrappedText = `{"data":${cleanedText}}`;
            const parsedData = JSON.parse(wrappedText);
            analysis = parsedData.data;
            
            // Enforce strict schema with type validation and sanitization
            const sanitizedAnalysis = {
                description: typeof analysis.description === 'string' ? analysis.description : `Analysis of ${functionName}`,
                type: typeof analysis.type === 'string' ? analysis.type : 'Unknown',
                parameterDescriptions: Array.isArray(analysis.parameterDescriptions) ? 
                    analysis.parameterDescriptions.filter(desc => typeof desc === 'string') : [],
                returnDescription: typeof analysis.returnDescription === 'string' ? 
                    analysis.returnDescription : 'Unknown return value',
                codePatterns: Array.isArray(analysis.codePatterns) ? 
                    analysis.codePatterns.filter(pattern => typeof pattern === 'string') : [],
                dependencies: {
                    external: Array.isArray(analysis.dependencies?.external) ? 
                        analysis.dependencies.external.filter(dep => typeof dep === 'string') : [],
                    internal: Array.isArray(analysis.dependencies?.internal) ? 
                        analysis.dependencies.internal.filter(dep => typeof dep === 'string') : []
                },
                securityConsiderations: typeof analysis.securityConsiderations === 'string' ? 
                    analysis.securityConsiderations : '',
                performanceConsiderations: typeof analysis.performanceConsiderations === 'string' ? 
                    analysis.performanceConsiderations : '',
                testingGuidelines: typeof analysis.testingGuidelines === 'string' ? 
                    analysis.testingGuidelines : '',
                complexity: {
                    cognitive: typeof analysis.complexity?.cognitive === 'string' ? 
                        analysis.complexity.cognitive : 'Not assessed',
                    cyclomaticComplexity: typeof analysis.complexity?.cyclomaticComplexity === 'string' ? 
                        analysis.complexity.cyclomaticComplexity : 'Not assessed'
                },
                maintainability: typeof analysis.maintainability === 'string' ? 
                    analysis.maintainability : 'Not assessed',
                bestPractices: Array.isArray(analysis.bestPractices) ? 
                    analysis.bestPractices.filter(practice => typeof practice === 'string') : [],
                suggestedImprovements: Array.isArray(analysis.suggestedImprovements) ? 
                    analysis.suggestedImprovements.filter(suggestion => typeof suggestion === 'string') : []
            };
            
            return sanitizedAnalysis;
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
        
        // First, try to get the default branch name
        let defaultBranch;
        try {
            const { data: repoData } = await octokit.repos.get({
                owner,
                repo
            });
            defaultBranch = repoData.default_branch;
            console.log(`Using repository's default branch: ${defaultBranch}`);
        } catch (branchError) {
            console.warn('Could not fetch default branch:', branchError);
            defaultBranch = null;
        }

        // Array of branch names to try
        const branchesToTry = [
            defaultBranch,
            'main',
            'master',
            'development',
            'dev'
        ].filter(Boolean); // Remove null/undefined values

        let tree;
        let usedBranch;

        // Try each branch name until one works
        for (const branch of branchesToTry) {
            try {
                const response = await octokit.git.getTree({
                    owner,
                    repo,
                    tree_sha: branch,
                    recursive: true
                });
                tree = response.data;
                usedBranch = branch;
                console.log(`Successfully fetched tree using branch: ${branch}`);
                break;
            } catch (treeError) {
                console.warn(`Failed to fetch tree using branch ${branch}:`, treeError);
                continue;
            }
        }

        if (!tree) {
            throw new Error('Could not fetch repository tree from any known branch');
        }

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