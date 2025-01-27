import { Paper, Typography, List, ListItem, ListItemText, Divider, Chip, Box, Alert } from '@mui/material';

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
                            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
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
                                                Type: {func.type === 'class' ? 'Class' : func.type}
                                            </Typography>
                                            {func.type === 'class' && (
                                                <Box sx={{ ml: 2 }}>
                                                    {func.parentClass && (
                                                        <Typography component="div" variant="body2">
                                                            Extends: {func.parentClass}
                                                        </Typography>
                                                    )}
                                                    <Typography component="div" variant="body2">
                                                        Constructor Parameters: {func.arguments.join(', ') || 'None'}
                                                    </Typography>
                                                </Box>
                                            )}
                                            <Typography component="div" variant="body2">
                                                Arguments: {func.arguments.join(', ') || 'None'}
                                            </Typography>
                                            <Typography component="div" variant="body2">
                                                Return: {func.returnValue || 'None'}
                                            </Typography>
                                            {func.description && (
                                                <Typography component="div" variant="body2" color="text.primary" sx={{ mt: 1 }}>
                                                    Function Purpose:
                                                    <Typography component="div" variant="body2" sx={{ ml: 2 }}>
                                                        {func.description}
                                                    </Typography>
                                                </Typography>
                                            )}
                                            {func.securityConsiderations && (
                                                <Typography component="div" variant="body2" color="warning.main">
                                                    Security Considerations:
                                                    <Typography component="div" variant="body2" sx={{ ml: 2 }}>
                                                        {func.securityConsiderations}
                                                    </Typography>
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
                                            {func.name.startsWith('use') && (
                                                <Typography component="div" variant="body2" color="info.main" sx={{ mt: 1 }}>
                                                    React Hook Documentation:
                                                    <Typography component="div" variant="body2" sx={{ ml: 2 }}>
                                                        {func.name === 'useEffect' && 'useEffect is a React Hook that lets you synchronize a component with an external system. It accepts a function that contains side-effect code and a dependency array that controls when the effect runs.'}
                                                        {func.name === 'useState' && 'useState is a React Hook that lets you add state to functional components. It returns an array with two values: the current state and a function to update it.'}
                                                        {func.name === 'useCallback' && 'useCallback is a React Hook that lets you cache a function definition between re-renders. It helps optimize performance by preventing unnecessary re-renders of child components.'}
                                                        {func.name === 'useMemo' && 'useMemo is a React Hook that lets you cache the result of a calculation between re-renders. It helps optimize performance by avoiding expensive calculations on every render.'}
                                                        {func.name === 'useContext' && 'useContext is a React Hook that lets you read and subscribe to context from your component. It provides a way to pass data through the component tree without passing props manually.'}
                                                        {func.name === 'useRef' && (
                                                            'useRef is a React Hook that lets you reference a value thats not needed for rendering. It returns a mutable ref object that persists for the full lifetime of the component and can be used to store any mutable value.'
                                                        )}
                                                    </Typography>
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