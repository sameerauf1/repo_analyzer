import { useState } from 'react';
import { Container, Box, Stack, CssBaseline, Paper, ThemeProvider, createTheme } from '@mui/material';
import * as parser from '@babel/parser';
import { default as traverse } from '@babel/traverse';
import * as t from '@babel/types';
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
            // Parse code using Babel
            const ast = parser.parse(fileData.content, {
              sourceType: 'module',
              plugins: ['jsx', 'typescript', 'classProperties', 'decorators-legacy']
            });

            const analyzedFunctions = [];
            traverse(ast, {
              FunctionDeclaration(path) {
                analyzedFunctions.push(extractFunctionInfo(path, fileData.path));
              },
              ArrowFunctionExpression(path) {
                if (path.parent.type === 'VariableDeclarator') {
                  analyzedFunctions.push(extractFunctionInfo(path, fileData.path));
                }
              },
              ClassDeclaration(path) {
                analyzedFunctions.push(extractClassInfo(path, fileData.path));
              },
              ClassMethod(path) {
                if (!path.node.computed && !path.node.static) {
                  analyzedFunctions.push(extractMethodInfo(path, fileData.path));
                }
              }
            });

            // Helper function to extract function information
            function extractFunctionInfo(path, filePath) {
              const node = path.node;
              const name = node.id?.name || path.parent.id?.name || 'Anonymous';
              const isExported = path.findParent(p => p.isExportDeclaration()) !== null;
              const isAsync = node.async;
              const params = node.params.map(param => {
                if (t.isIdentifier(param)) return param.name;
                if (t.isObjectPattern(param)) return '{' + param.properties.map(p => p.key.name).join(', ') + '}';
                if (t.isArrayPattern(param)) return '[' + param.elements.map(e => e?.name || '_').join(', ') + ']';
                return 'param';
              });

              return {
                name,
                type: 'function',
                isExported,
                isAsync,
                arguments: params,
                filePath
              };
            }

            // Helper function to extract class information
            function extractClassInfo(path, filePath) {
              const node = path.node;
              const name = node.id.name;
              const isExported = path.findParent(p => p.isExportDeclaration()) !== null;
              const superClass = node.superClass?.name;

              return {
                name,
                type: 'class',
                isExported,
                arguments: [],
                parentClass: superClass,
                filePath
              };
            }

            // Helper function to extract method information
            function extractMethodInfo(path, filePath) {
              const node = path.node;
              const name = node.key.name;
              const isAsync = node.async;
              const params = node.params.map(param => {
                if (t.isIdentifier(param)) return param.name;
                if (t.isObjectPattern(param)) return '{' + param.properties.map(p => p.key.name).join(', ') + '}';
                return 'param';
              });

              return {
                name,
                type: 'method',
                isAsync,
                arguments: params,
                filePath
              };
            }

            // Analyze each function with Gemini
            const analyzedWithAI = await Promise.all(
              analyzedFunctions.map(async func => {
                const aiAnalysis = await analyzeCodeWithGemini(
                  fileData.content.substring(
                    func.start,
                    func.end
                  ),
                  func.name,
                  func.filePath
                );

                return {
                  ...func,
                  description: aiAnalysis.description,
                  returnValue: aiAnalysis.returnDescription,
                  securityConsiderations: aiAnalysis.securityConsiderations,
                  dependencies: aiAnalysis.dependencies || { imports: [], internalCalls: [], externalCalls: [] }
                };
              })
            );

            setFunctions(analyzedWithAI);
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
