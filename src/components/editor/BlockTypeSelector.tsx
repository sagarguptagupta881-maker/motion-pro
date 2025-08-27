'use client';

import React, { useEffect, useRef } from 'react';
import { 
  FileText, Heading1, Heading2, Heading3, List, Hash, Quote, Code, 
  Image, Table, CheckSquare, Lightbulb, ChevronRight, Type, Minus
} from 'lucide-react';
import { BlockType } from '@/types';

interface BlockTypeSelectorProps {
  onSelect: (type: BlockType) => void;
  onClose: () => void;
  position?: { x: number; y: number };
}

const blockTypes = [
  { 
    category: 'Basic blocks',
    items: [
      { type: 'text' as BlockType, icon: Type, label: 'Text', description: 'Just start writing with plain text.' },
      { type: 'heading1' as BlockType, icon: Heading1, label: 'Heading 1', description: 'Big section heading.' },
      { type: 'heading2' as BlockType, icon: Heading2, label: 'Heading 2', description: 'Medium section heading.' },
      { type: 'heading3' as BlockType, icon: Heading3, label: 'Heading 3', description: 'Small section heading.' },
      { type: 'bullet' as BlockType, icon: List, label: 'Bulleted list', description: 'Create a simple bulleted list.' },
      { type: 'numbered' as BlockType, icon: Hash, label: 'Numbered list', description: 'Create a list with numbering.' },
      { type: 'quote' as BlockType, icon: Quote, label: 'Quote', description: 'Capture a quote.' },
      { type: 'code' as BlockType, icon: Code, label: 'Code', description: 'Capture a code snippet.' },
      { type: 'divider' as BlockType, icon: Minus, label: 'Divider', description: 'Visually divide blocks.' },
    ]
  },
  {
    category: 'Media',
    items: [
      { type: 'image' as BlockType, icon: Image, label: 'Image', description: 'Upload or embed with a link.' },
      { type: 'table' as BlockType, icon: Table, label: 'Table', description: 'Add a table to organize data.' },
      { type: 'checklist' as BlockType, icon: CheckSquare, label: 'To-do list', description: 'Track tasks with a to-do list.' },
    ]
  }
];

export const BlockTypeSelector: React.FC<BlockTypeSelectorProps> = ({ 
  onSelect, 
  onClose, 
  position 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleSelect = (type: BlockType) => {
    onSelect(type);
    onClose();
  };

  return (
    <div 
      ref={containerRef}
      className="bg-gray-800 border border-gray-600 rounded-lg shadow-xl w-80 max-h-96 overflow-y-auto z-50"
      style={position ? { 
        position: 'absolute', 
        left: position.x, 
        top: position.y 
      } : {}}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Add a block</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ×
          </button>
        </div>
        
        {blockTypes.map(({ category, items }) => (
          <div key={category} className="mb-4">
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 px-2">
              {category}
            </div>
            <div className="space-y-1">
              {items.map(({ type, icon: Icon, label, description }) => (
                <button
                  key={type}
                  onClick={() => handleSelect(type)}
                  className="w-full flex items-center space-x-3 p-2 hover:bg-gray-700 rounded text-sm text-gray-300 hover:text-white transition-colors group"
                >
                  <div className="flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium truncate">{label}</div>
                    <div className="text-xs text-gray-500 truncate">{description}</div>
                  </div>
                  <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Quick shortcuts hint */}
        <div className="border-t border-gray-700 pt-2 mt-2">
          <div className="text-xs text-gray-500 px-2">
            <p className="mb-1"><strong>Tip:</strong> Type "/" for quick access</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-gray-700 px-2 py-1 rounded">/1 Heading 1</span>
              <span className="bg-gray-700 px-2 py-1 rounded">/2 Heading 2</span>
              <span className="bg-gray-700 px-2 py-1 rounded">/• Bullet</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};