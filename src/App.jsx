import { useState } from 'react';
import { Container, Box, Stack, CssBaseline, Paper, ThemeProvider, createTheme } from '@mui/material';
import RepositoryInput from './components/RepositoryInput';
import FunctionAnalyzer from './components/FunctionAnalyzer';
import FileTree from './components/FileTree';
import { fetchRepositoryFiles, fetchFileContent, analyzeCodeWithGemini } from './services/githubService';

// Create a custom theme for a luxurious look
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#B8860B', // Dark golden color
    },
    secondary: {
      main: '#C0C0C0', // Silver color
    },
    background: {
      default: '#1A1A1A',
      paper: '#2D2D2D',
    },
  },
  typography: {
    fontFamily: '"Playfair Display", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
      letterSpacing: '0.02em',
    },
    h6: {
      fontWeight: 500,
      letterSpacing: '0.01em',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            boxShadow: '0 8px 24px rgba(184, 134, 11, 0.15)',
          },
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingTop: '2rem',
          paddingBottom: '2rem',
        },
      },
    },
  },
});

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

                // Analyze function calls within the body
                const functionCalls = [];
                const callPattern = /\b([\w$]+)\s*\(/g;
                let callMatch;
                while ((callMatch = callPattern.exec(functionBody)) !== null) {
                  const calledFunction = callMatch[1];
                  if (calledFunction !== name) { // Avoid self-references
                    functionCalls.push(calledFunction);
                  }
                }

                // Get AI analysis for the function
                const aiAnalysis = await analyzeCodeWithGemini(matchStr, name, file.path);

                // Analyze function relationships and call patterns
                const dependencies = {
                  imports: imports,
                  internalCalls: functionCalls,
                  externalCalls: aiAnalysis.dependencies?.externalCalls || []
                };

                return {
                  name,
                  type: aiAnalysis.type || type,
                  description: aiAnalysis.description || `${type === 'class' ?
                    `A class that ${parentClass ? `extends ${parentClass} and ` : ''}provides structured organization of related methods and properties` :
                    isGetter ? `A getter method that provides controlled access to a property` :
                      isSetter ? `A setter method that provides controlled modification of a property` :
                        isAsync ? `An asynchronous function that handles non-blocking operations` :
                          isArrow ? `An arrow function that ${args ? `takes ${args} as input and` : ''} provides functional programming style implementation` :
                            `A standard function that ${args ? `accepts ${args} as parameters and` : ''} encapsulates reusable logic`
                    } in ${file.path}`,
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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <RepositoryInput onSubmit={handleRepositorySubmit} />
        <Stack direction="row" spacing={4} sx={{ mt: 4 }}>
          <Box flex={1} maxWidth={400}>
            <Paper
              elevation={3}
              sx={{
                p: 3,
                height: '75vh',
                borderRadius: 2,
                border: '1px solid rgba(184, 134, 11, 0.1)',
              }}
            >
              <FileTree files={files} onFileSelect={handleFileSelect} />
            </Paper>
          </Box>
          <Box flex={2}>
            <Paper
              elevation={3}
              sx={{
                p: 3,
                borderRadius: 2,
                border: '1px solid rgba(184, 134, 11, 0.1)',
              }}
            >
              <FunctionAnalyzer functions={functions} />
            </Paper>
          </Box>
        </Stack>
      </Container>
    </ThemeProvider>
  );
}

export default App;
