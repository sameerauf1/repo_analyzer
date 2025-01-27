import { useState } from 'react';
import { TreeView, TreeItem } from '@mui/lab';
import { ExpandMore, ChevronRight, Folder, InsertDriveFile } from '@mui/icons-material';
import { Box, Typography } from '@mui/material';

const FileTreeView = ({ files, onFileSelect }) => {
    const [expanded, setExpanded] = useState([]);

    const handleToggle = (event, nodeIds) => {
        setExpanded(nodeIds);
    };

    const renderTree = (node) => {
        const isDirectory = node.type === 'tree';
        const icon = isDirectory ? <Folder color="primary" /> : <InsertDriveFile />;

        return (
            <TreeItem
                key={node.path}
                nodeId={node.path}
                onClick={() => onFileSelect(node)}
                label={
                    <Box sx={{ display: 'flex', alignItems: 'center', p: 0.5, pr: 0 }}>
                        {icon}
                        <Typography variant="body2" sx={{ ml: 1 }}>
                            {node.name}
                        </Typography>
                    </Box>
                }
            >
                {Array.isArray(node.children)
                    ? node.children.map((childNode) => renderTree(childNode))
                    : null}
            </TreeItem>
        );
    };

    return (
        <Box sx={{ minHeight: 270, flexGrow: 1, maxWidth: 400 }}>
            <TreeView
                expanded={expanded}
                onNodeToggle={handleToggle}
                defaultCollapseIcon={<ExpandMore />}
                defaultExpandIcon={<ChevronRight />}
            >
                {files.map((node) => renderTree(node))}
            </TreeView>
        </Box>
    );
};

export default FileTreeView;