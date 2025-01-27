import { Paper, Typography, List, ListItem, ListItemText, Divider } from '@mui/material';

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
                {functions.map((func, index) => (
                    <div key={func.name}>
                        <ListItem>
                            <ListItemText
                                primary={func.name}
                                secondary={
                                    <>
                                        <Typography component="span" variant="body2" color="text.primary">
                                            Description: {func.description}
                                        </Typography>
                                        <br />
                                        <Typography component="span" variant="body2">
                                            Arguments: {func.arguments.join(', ') || 'None'}
                                        </Typography>
                                        <br />
                                        <Typography component="span" variant="body2">
                                            Return: {func.returnValue || 'None'}
                                        </Typography>
                                    </>
                                }
                            />
                        </ListItem>
                        {index < functions.length - 1 && <Divider />}
                    </div>
                ))}
            </List>
        </Paper>
    );
};

export default FunctionAnalyzer;