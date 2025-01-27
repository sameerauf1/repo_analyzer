import { useState } from 'react';
import { TextField, Button, Box, Paper, Typography } from '@mui/material';

const RepositoryInput = ({ onSubmit }) => {
    const [repoUrl, setRepoUrl] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!repoUrl) {
            setError('Please enter a repository URL');
            return;
        }

        try {
            const url = new URL(repoUrl);
            if (url.hostname !== 'github.com') {
                setError('Please enter a valid GitHub repository URL');
                return;
            }
            const path = url.pathname.split('/');
            if (path.length < 3) {
                setError('Invalid repository URL format');
                return;
            }
            const owner = path[1];
            const repo = path[2];
            onSubmit({ owner, repo });
            setError('');
        } catch (err) {
            setError('Please enter a valid URL');
        }
    };

    return (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
                Enter GitHub Repository URL
            </Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 2 }}>
                <TextField
                    fullWidth
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/owner/repository"
                    error={!!error}
                    helperText={error}
                    variant="outlined"
                />
                <Button type="submit" variant="contained" color="primary">
                    Analyze
                </Button>
            </Box>
        </Paper>
    );
};

export default RepositoryInput;