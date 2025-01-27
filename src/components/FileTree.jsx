import { TreeView as MUITreeView, TreeItem } from '@mui/x-tree-view';
import { ExpandMore, ChevronRight } from '@mui/icons-material';
import { Box, Typography } from '@mui/material';

const FileTree = ({ files, onFileSelect }) => {
    const renderTree = (nodes) => (
        nodes.map((node) => (
            <TreeItem
                key={node.path}
                nodeId={node.path}
                label={
                    <Box
                        component="div"
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            p: 0.5,
                            pr: 0
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onFileSelect(node);
                        }}
                    >
                        <Typography variant="body2">
                            {node.name}
                        </Typography>
                    </Box>
                }
            >
                {Array.isArray(node.children) && node.children.length > 0
                    ? renderTree(node.children)
                    : null}
            </TreeItem>
        ))
    );

    return (
        <MUITreeView
            defaultCollapseIcon={<ExpandMore />}
            defaultExpandIcon={<ChevronRight />}
            sx={{
                height: '100%',
                flexGrow: 1,
                maxWidth: 400,
                overflowY: 'auto'
            }}
        >
            {renderTree(files)}
        </MUITreeView>
    );
};

export default FileTree;