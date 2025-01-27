import { useState } from 'react';
import { Container, Grid, CssBaseline } from '@mui/material';
import RepositoryInput from './components/RepositoryInput';
import FileTreeView from './components/FileTreeView';
import CodeViewer from './components/CodeViewer';
import FunctionAnalyzer from './components/FunctionAnalyzer';
import { fetchRepositoryFiles, fetchFileContent } from './services/githubService';

function App() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [functions, setFunctions] = useState([]);

  const handleRepositorySubmit = async ({ owner, repo }) => {
    try {
      setFiles([]);
      setSelectedFile(null);
      setFunctions([]);
      setCurrentRepo({ owner, repo });

      const files = await fetchRepositoryFiles(owner, repo);
      setFiles(files);

      // Create a tree structure from flat files array
      const createTree = (items) => {
        const root = [];
        const map = {};

        items.forEach(item => {
          map[item.path] = { ...item, children: [] };
        });

        items.forEach(item => {
          const parts = item.path.split('/');
          if (parts.length === 1) {
            root.push(map[item.path]);
          } else {
            const parentPath = parts.slice(0, -1).join('/');
            if (map[parentPath]) {
              map[parentPath].children.push(map[item.path]);
            }
          }
        });

        return root;
      };

      setFiles(createTree(files));
    } catch (error) {
      console.error('Error loading repository:', error);
      // TODO: Add error handling UI
    }
  };

  const [currentRepo, setCurrentRepo] = useState({ owner: '', repo: '' });

  const handleFileSelect = async (file) => {
    if (file.type === 'blob') {
      try {
        const fileData = await fetchFileContent(currentRepo.owner, currentRepo.repo, file.path);
        setSelectedFile(fileData);

        // Analyze functions if it's a JavaScript/TypeScript file
        const isJsFile = /\.(js|jsx|ts|tsx)$/.test(file.path);
        if (isJsFile) {
          const functionMatches = fileData.content.match(/function\s+([\w$]+)\s*\(([^)]*)\)|const\s+([\w$]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>|class\s+([\w$]+)/g) || [];
          const analyzedFunctions = functionMatches.map(match => {
            const name = match.match(/[\w$]+/)[0];
            const args = match.match(/\(([^)]*)\)/)?.[1] || '';
            return {
              name,
              description: `Function found in ${file.path}`,
              arguments: args.split(',').map(arg => arg.trim()).filter(arg => arg),
              returnValue: 'Unknown'
            };
          });
          setFunctions(analyzedFunctions);
        } else {
          setFunctions([]);
        }
      } catch (error) {
        console.error('Error loading file:', error);
        // TODO: Add error handling UI
      }
    }
  };

  return (
    <>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <RepositoryInput onSubmit={handleRepositorySubmit} />
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <FileTreeView files={files} />
          </Grid>
          <Grid item xs={12} md={8}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <CodeViewer
                  content={selectedFile?.content}
                  filename={selectedFile?.name}
                />
              </Grid>
              <Grid item xs={12}>
                <FunctionAnalyzer functions={functions} />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}

export default App;
