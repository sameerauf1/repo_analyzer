import { Paper, Typography, List, ListItem, ListItemText, Divider, Chip, Box, Alert } from '@mui/material';

const FunctionAnalyzer = ({ functions }) => {
    if (!functions || functions.length === 0) {
        return (
            <Paper elevation={3} sx={{ p: 3, borderRadius: 2, border: '1px solid rgba(184, 134, 11, 0.1)' }}>
                <Typography variant="h6" gutterBottom sx={{ color: '#B8860B', letterSpacing: '0.02em' }}>
                    Function Analysis
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Select a file to view its functions
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper elevation={3} sx={{ p: 3, borderRadius: 2, border: '1px solid rgba(184, 134, 11, 0.1)' }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#B8860B', letterSpacing: '0.02em', mb: 2 }}>
                Function Analysis
            </Typography>
            {functions[0] && functions[0].filePath && (
                <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ fontStyle: 'italic', mb: 2 }}>
                    Direct File Path: {functions[0].filePath}
                </Typography>
            )}
            <List sx={{ '& .MuiListItem-root': { mb: 2 } }}>
                {functions.map((func, index) => {
                    const functionKey = `${func.name}-${func.type}-${index}`;
                    return (
                        <div key={functionKey}>
                            <ListItem sx={{
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                backgroundColor: 'rgba(45, 45, 45, 0.5)',
                                borderRadius: 1,
                                transition: 'all 0.3s ease-in-out',
                                '&:hover': {
                                    backgroundColor: 'rgba(45, 45, 45, 0.8)',
                                    transform: 'translateY(-2px)',
                                }
                            }}>
                                <Box sx={{ width: '100%' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                                        <Typography component="span" variant="subtitle1" sx={{ color: '#B8860B', fontWeight: 500 }}>
                                            {func.name}
                                        </Typography>
                                        {func.isExported && (
                                            <Chip
                                                label="Exported"
                                                size="small"
                                                sx={{
                                                    backgroundColor: 'rgba(184, 134, 11, 0.1)',
                                                    color: '#B8860B',
                                                    borderColor: '#B8860B',
                                                    '&:hover': { backgroundColor: 'rgba(184, 134, 11, 0.2)' }
                                                }}
                                                variant="outlined"
                                            />
                                        )}
                                        {func.isAsync && (
                                            <Chip
                                                label="Async"
                                                size="small"
                                                sx={{
                                                    backgroundColor: 'rgba(192, 192, 192, 0.1)',
                                                    color: '#C0C0C0',
                                                    borderColor: '#C0C0C0',
                                                    '&:hover': { backgroundColor: 'rgba(192, 192, 192, 0.2)' }
                                                }}
                                                variant="outlined"
                                            />
                                        )}
                                    </Box>
                                    <Box sx={{ mt: 1 }}>
                                        <Typography component="div" variant="body2" sx={{ color: '#C0C0C0', mb: 1 }}>
                                            Type: {func.type === 'class' ? 'Class' : func.type}
                                        </Typography>
                                        <Typography component="div" variant="body2" sx={{ color: '#A9A9A9', mb: 1 }}>
                                            Arguments: {func.arguments.join(', ') || 'None'}
                                        </Typography>
                                        {func.description && (
                                            <Typography component="div" variant="body2" sx={{
                                                color: '#D4AF37',
                                                backgroundColor: 'rgba(212, 175, 55, 0.05)',
                                                p: 1.5,
                                                borderRadius: 1,
                                                mb: 1
                                            }}>
                                                {func.description}
                                            </Typography>
                                        )}
                                        {func.dependencies && func.dependencies.length > 0 && (
                                            <Box sx={{ mt: 2 }}>
                                                <Typography component="div" variant="body2" sx={{ color: '#C0C0C0', mb: 1 }}>
                                                    Dependencies:
                                                </Typography>
                                                <ul style={{ margin: 0, paddingLeft: 20 }}>
                                                    {func.dependencies.map((dep, i) => (
                                                        <li key={i}>
                                                            <Typography component="span" variant="body2" sx={{ color: '#A9A9A9' }}>
                                                                {dep}
                                                            </Typography>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                            </ListItem>
                            {index < functions.length - 1 && <Divider sx={{ my: 2 }} />}
                        </div>
                    );
                })}
            </List>
        </Paper>
    );
};

export default FunctionAnalyzer;