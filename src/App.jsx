import { useState } from 'react';
import { Container, Box, Stack, CssBaseline, Paper } from '@mui/material';
import RepositoryInput from './components/RepositoryInput';
import FunctionAnalyzer from './components/FunctionAnalyzer';
import FileTree from './components/FileTree';
import { fetchRepositoryFiles, fetchFileContent, analyzeCodeWithGemini } from './services/githubService';

function App() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [functions, setFunctions] = useState([]);
  const [currentRepo, setCurrentRepo] = useState({ owner: '', repo: '' });

  const handleRepositorySubmit = async ({ owner, repo }) => {
    try {
      console.log(`Loading repository: ${owner}/${repo}`);
      setFiles([]);
      setSelectedFile(null);
      setFunctions([]);
      setCurrentRepo({ owner, repo });

      const files = await fetchRepositoryFiles(owner, repo);
      console.log(`Found ${files.length} files in repository`);
      setFiles(files);

      // Create a tree structure from flat files array
      const createTree = (items) => {
        console.log('Creating file tree structure...');
        const root = [];
        const map = {};

        // First, create directory nodes
        items.forEach(item => {
          const parts = item.path.split('/');
          let currentPath = '';

          parts.forEach((part, index) => {
            const path = index === 0 ? part : `${currentPath}/${part}`;
            if (!map[path]) {
              map[path] = {
                name: part,
                path: path,
                type: index === parts.length - 1 ? item.type : 'tree',
                children: [],
                id: `${path}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` // Add unique id
              };
            }
            currentPath = path;
          });
        });

        // Then, build the tree structure
        items.forEach(item => {
          const parts = item.path.split('/');
          if (parts.length === 1) {
            root.push(map[item.path]);
          } else {
            const parentPath = parts.slice(0, -1).join('/');
            if (map[parentPath] && !map[parentPath].children.includes(map[item.path])) {
              map[parentPath].children.push(map[item.path]);
            }
          }
        });

        console.log('File tree structure created successfully');
        return root;
      };

      setFiles(createTree(files));
    } catch (error) {
      console.error('Error loading repository:', error);
      // TODO: Add error handling UI
    }
  };

  const handleFileSelect = async (file) => {
    if (file.type === 'blob') {
      try {
        console.log(`Loading file content: ${file.path}`);
        const fileData = await fetchFileContent(currentRepo.owner, currentRepo.repo, file.path);
        setSelectedFile(fileData);

        // Reset functions array before analysis
        setFunctions([]);

        // Analyze functions if it's a JavaScript/TypeScript file
        const isJsFile = /\.(js|jsx|ts|tsx)$/.test(file.path);
        if (isJsFile) {
          console.log(`Analyzing functions in ${file.path}`);
          try {
            // Extract imports to track dependencies
            const importMatches = fileData.content.match(/import\s+(?:{[^}]+}|[^;]+)\s+from\s+['"]([^'"]+)['"];?/g) || [];
            const imports = importMatches.map(match => {
              const [, path] = match.match(/from\s+['"]([^'"]+)['"]/);
              return path;
            });

            // Enhanced regex patterns to capture different function declarations and React components
            const functionRegexes = [
              // React functional components
              /(?:export\s+)?(?:const|let|var)\s+([\w$]+)\s*=\s*(?:React\.)?(?:memo\s*)?\(?(\(?props\)?|\{[^}]*\})?\s*=>\s*{?/g,
              // Named function declarations and async functions
              /(?:export\s+)?(?:async\s+)?function\s+([\w$]+)\s*\(([^)]*)\)/g,
              // Class declarations with optional extends
              /(?:export\s+)?class\s+([\w$]+)(?:\s+extends\s+(?:React\.)?Component|PureComponent|[\w$.]+)?/g,
              // Arrow functions and function expressions assigned to variables
              /(?:export\s+)?(?:const|let|var)\s+([\w$]+)\s*=\s*(?:async\s*)?(?:function\s*\(([^)]*)\)|\(([^)]*)\)\s*=>)/g,
              // Object method definitions including React lifecycle methods
              /(?:async\s+)?(?:componentDidMount|componentDidUpdate|componentWillUnmount|render|[\w$]+)\s*\(([^)]*)\)\s*{/g,
              // Getter/setter methods
              /(?:get|set)\s+([\w$]+)\s*\(([^)]*)\)\s*{/g,
              // useEffect and other hooks
              /(?:const|let|var)\s+([\w$]+)\s*=\s*use[A-Z][\w$]*\(/g
            ];

            const functionMatches = [];
            functionRegexes.forEach(regex => {
              const matches = [...fileData.content.matchAll(regex)] || [];
              functionMatches.push(...matches);
            });

            console.log(`Found ${functionMatches.length} functions/classes`);

            const analyzedFunctions = await Promise.all(functionMatches.map(async match => {
              try {
                const matchStr = match[0] || '';
                const isClass = matchStr.includes('class');
                const isAsync = matchStr.includes('async');
                const isExported = matchStr.includes('export');
                const isArrow = matchStr.includes('=>');
                const isGetter = matchStr.startsWith('get');
                const isSetter = matchStr.startsWith('set');

                let name = '';
                let args = '';
                let type = 'function';
                let parentClass = '';

                if (isClass) {
                  const classMatch = matchStr.match(/class\s+([\w$]+)(?:\s+extends\s+([\w$.]+))?(?:\s+implements\s+([\w$.,\s]+))?/);
                  if (classMatch) {
                    name = classMatch[1];
                    parentClass = classMatch[2] || '';
                    const interfaces = classMatch[3] ? classMatch[3].split(',').map(i => i.trim()) : [];
                    type = 'class';

                    // Extract class methods and properties
                    const methodMatches = matchStr.match(/(?:public|private|protected)?\s*(?:static)?\s*(?:async\s+)?[\w$]+\s*\([^)]*\)\s*{/g) || [];
                    const propertyMatches = matchStr.match(/(?:public|private|protected)?\s*(?:static)?\s*(?:readonly)?\s*[\w$]+\s*[=;]/g) || [];

                    args = methodMatches.map(m => {
                      const visibility = m.match(/public|private|protected/)?.[0] || 'public';
                      const isStatic = m.includes('static');
                      const methodName = m.match(/[\w$]+(?=\s*\()/)[0];
                      return `${visibility}${isStatic ? ' static' : ''} ${methodName}`;
                    });
                  }
                } else {
                  // Try different patterns to extract function name
                  const patterns = [
                    /(?:function\s+|(?:const|let|var)\s+)([\w$]+)/, // Regular function or variable declaration
                    /([\w$]+)\s*=/, // Assignment
                    /(?:get|set)\s+([\w$]+)/, // Getter/setter
                    /([\w$]+)\s*\(/ // Method definition
                  ];

                  for (const pattern of patterns) {
                    const nameMatch = matchStr.match(pattern);
                    if (nameMatch && nameMatch[1]) {
                      name = nameMatch[1];
                      break;
                    }
                  }

                  args = matchStr.match(/\(([^)]*)\)/)?.[1] || '';
                }

                // Extract function body to analyze dependencies and return type
                const bodyStart = matchStr.indexOf('{');
                const bodyEnd = matchStr.lastIndexOf('}');
                const functionBody = bodyStart >= 0 && bodyEnd >= 0 ?
                  matchStr.slice(bodyStart + 1, bodyEnd) : '';

                // Get AI analysis for the function
                const aiAnalysis = await analyzeCodeWithGemini(matchStr, name);

                const dependencies = imports.filter(imp => {
                  const importName = imp.split('/').pop();
                  return functionBody.includes(importName) || matchStr.includes(importName);
                });

                return {
                  name,
                  type: aiAnalysis.type || type,
                  description: aiAnalysis.description || `${type === 'class' ? 'Class' : isGetter ? 'Getter' : isSetter ? 'Setter' : 'Function'} found in ${file.path}`,
                  arguments: aiAnalysis.parameterDescriptions || args.split(',').map(arg => arg.trim()).filter(arg => arg),
                  isAsync,
                  isExported,
                  isArrow: type === 'function' ? isArrow : undefined,
                  isGetter: type === 'function' ? isGetter : undefined,
                  isSetter: type === 'function' ? isSetter : undefined,
                  parentClass: type === 'class' ? parentClass : undefined,
                  returnValue: aiAnalysis.returnDescription || 'Unknown',
                  securityConsiderations: aiAnalysis.securityConsiderations,
                  asyncBehavior: aiAnalysis.asyncBehavior,
                  errorHandling: aiAnalysis.errorHandling,
                  dependencies,
                  filePath: file.path
                };
              } catch (error) {
                console.error('Error analyzing function:', error);
                return {
                  name: 'Error',
                  type: 'error',
                  description: `Error analyzing function: ${error.message}`,
                  arguments: [],
                  isAsync: false,
                  isExported: false,
                  returnValue: 'Analysis failed',
                  dependencies: [],
                  filePath: file.path
                };
              }
            }));
            setFunctions(analyzedFunctions);
          } catch (analysisError) {
            console.error('Error during code analysis:', analysisError);
            setFunctions([{
              name: 'Analysis Error',
              type: 'error',
              description: `Error during code analysis: ${analysisError.message}`,
              arguments: [],
              isAsync: false,
              isExported: false,
              returnValue: 'Analysis failed',
              dependencies: [],
              filePath: file.path
            }]);
          }
        } else {
          console.log('Selected file is not a JavaScript/TypeScript file');
          setFunctions([{
            name: 'Non-JavaScript File',
            type: 'info',
            description: `Selected file (${file.path}) is not a JavaScript/TypeScript file. Function analysis is only available for .js, .jsx, .ts, and .tsx files.`,
            arguments: [],
            isAsync: false,
            isExported: false,
            returnValue: 'N/A',
            dependencies: [],
            filePath: file.path
          }]);
        }
      } catch (error) {
        console.error('Error loading file:', error);
        setFunctions([{
          name: 'Error',
          type: 'error',
          description: `Error loading file: ${error.message}`,
          arguments: [],
          isAsync: false,
          isExported: false,
          returnValue: 'N/A',
          dependencies: [],
          filePath: file.path
        }]);
      }
    }
  };

  return (
    <>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <RepositoryInput onSubmit={handleRepositorySubmit} />
        <Stack direction="row" spacing={3}>
          <Box flex={1} maxWidth={400}>
            <Paper elevation={3} sx={{ p: 2, height: '70vh' }}>
              <FileTree files={files} onFileSelect={handleFileSelect} />
            </Paper>
          </Box>
          <Box flex={2}>
            <FunctionAnalyzer functions={functions} />
          </Box>
        </Stack>
      </Container>
    </>
  );
}

export default App;
