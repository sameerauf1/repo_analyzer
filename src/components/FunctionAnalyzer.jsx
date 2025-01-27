import { Paper, Typography, List, ListItem, ListItemText, Divider, Chip, Box } from '@mui/material';

const FunctionAnalyzer = ({ functions }) => {
    if (!functions || functions.length === 0) {
        return (
            <Paper elevation={3} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Function Analysis
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Select a file to view its functions
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                Function Analysis
            </Typography>
            <List>
                {functions.map((func, index) => {
                    const functionKey = `${func.name}-${func.type}-${index}`;
                    return (
                        <div key={functionKey}>
                            <ListItem>
                                <ListItemText
                                    primary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                            <Typography component="span" variant="subtitle1">
                                                {func.name}
                                            </Typography>
                                            {func.isExported && (
                                                <Chip
                                                    label="Exported"
                                                    size="small"
                                                    color="primary"
                                                    variant="outlined"
                                                />
                                            )}
                                            {func.isAsync && (
                                                <Chip
                                                    label="Async"
                                                    size="small"
                                                    color="secondary"
                                                    variant="outlined"
                                                />
                                            )}
                                            {func.type === 'function' && (
                                                <>
                                                    {func.isArrow && (
                                                        <Chip
                                                            label="Arrow"
                                                            size="small"
                                                            color="info"
                                                            variant="outlined"
                                                        />
                                                    )}
                                                    {func.isGetter && (
                                                        <Chip
                                                            label="Getter"
                                                            size="small"
                                                            color="success"
                                                            variant="outlined"
                                                        />
                                                    )}
                                                    {func.isSetter && (
                                                        <Chip
                                                            label="Setter"
                                                            size="small"
                                                            color="warning"
                                                            variant="outlined"
                                                        />
                                                    )}
                                                </>
                                            )}
                                        </Box>
                                    }
                                    secondary={
                                        <Box sx={{ mt: 1 }}>
                                            <Typography component="div" variant="body2" color="text.primary">
                                                Type: {func.type}
                                            </Typography>
                                            {func.type === 'class' && func.parentClass && (
                                                <Typography component="div" variant="body2">
                                                    Extends: {func.parentClass}
                                                </Typography>
                                            )}
                                            <Typography component="div" variant="body2">
                                                Arguments: {func.arguments.join(', ') || 'None'}
                                            </Typography>
                                            <Typography component="div" variant="body2">
                                                Return: {func.returnValue || 'None'}
                                            </Typography>
                                            {func.securityConsiderations && (
                                                <Typography component="div" variant="body2">
                                                    Security: {func.securityConsiderations}
                                                </Typography>
                                            )}
                                            {func.asyncBehavior && (
                                                <Typography component="div" variant="body2">
                                                    Async Behavior: {func.asyncBehavior}
                                                </Typography>
                                            )}
                                            {func.errorHandling && (
                                                <Typography component="div" variant="body2">
                                                    Error Handling: {func.errorHandling}
                                                </Typography>
                                            )}
                                            {func.dependencies && func.dependencies.length > 0 && (
                                                <Box sx={{ mt: 1 }}>
                                                    <Typography component="div" variant="body2" color="text.primary">
                                                        Dependencies:
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                                                        {func.dependencies.map((dep, i) => (
                                                            <Chip
                                                                key={i}
                                                                label={dep}
                                                                size="small"
                                                                color="default"
                                                                variant="outlined"
                                                            />
                                                        ))}
                                                    </Box>
                                                </Box>
                                            )}
                                        </Box>
                                    }
                                />
                            </ListItem>
                            {index < functions.length - 1 && <Divider />}
                        </div>
                    );
                })}
            </List>
        </Paper>
    );
};

export default FunctionAnalyzer;