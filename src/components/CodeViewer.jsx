import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { Paper, Typography } from '@mui/material';

const CodeViewer = ({ content, filename }) => {
    const getLanguageExtension = () => {
        const ext = filename?.split('.').pop()?.toLowerCase();
        if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) {
            return [javascript()];
        }
        return [];
    };

    return (
        <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                {filename || 'Select a file to view'}
            </Typography>
            <CodeMirror
                value={content || ''}
                height="500px"
                theme="light"
                extensions={getLanguageExtension()}
                editable={false}
            />
        </Paper>
    );
};

export default CodeViewer;