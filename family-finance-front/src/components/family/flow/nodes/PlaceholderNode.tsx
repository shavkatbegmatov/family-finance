import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

export const PlaceholderNode = memo(() => {
    return (
        <div className="w-0 h-0 invisible" style={{ pointerEvents: 'none' }}>
            <Handle type="target" position={Position.Top} className="opacity-0" />
            <Handle type="source" position={Position.Bottom} className="opacity-0" />
        </div>
    );
});

PlaceholderNode.displayName = 'PlaceholderNode';
