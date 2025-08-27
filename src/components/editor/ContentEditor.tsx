'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Edit3, Save, X, Trash2, GripVertical } from 'lucide-react';
import { ContentBlock, BlockType } from '@/types';
import { useWorkspace } from '@/context/WorkspaceContext';

interface ContentEditorProps {
  block: ContentBlock;
  pageId: string;
  onUpdate: (blockId: string, content: string) => void;
  onDelete: (blockId: string) => void;
  onDuplicate?: (blockId: string) => void;
}

export const ContentEditor: React.FC<ContentEditorProps> = ({
  block,
  pageId,
  onUpdate,
  onDelete,
  onDuplicate
}) => {
  const { state, dispatch } = useWorkspace();
  const [isEditing, setIsEditing] = useState(state.editingBlockId === block.id);
  const [content, setContent] = useState(block.content);
  const [showActions, setShowActions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setIsEditing(state.editingBlockId === block.id);
  }, [state.editingBlockId, block.id]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(content.length, content.length);
      // Auto-resize textarea
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing, content]);

  const handleSave = () => {
    if (content.trim() !== block.content) {
      onUpdate(block.id, content.trim());
    }
    setIsEditing(false);
    dispatch({ type: 'SET_EDITING_BLOCK', payload: null });
  };

  const handleCancel = () => {
    setContent(block.content);
    setIsEditing(false);
    dispatch({ type: 'SET_EDITING_BLOCK', payload: null });
  };

  const startEditing = () => {
    setIsEditing(true);
    dispatch({ type: 'SET_EDITING_BLOCK', payload: block.id });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && block.type !== 'code') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const renderEditingView = () => (
    <div className="flex items-start space-x-2 group">
      <div className="flex-shrink-0 pt-2">
        <GripVertical className="w-4 h-4 text-gray-500 cursor-move" />
      </div>
      <div className="flex-1">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent border-2 border-blue-500 rounded px-3 py-2 text-white resize-none focus:outline-none focus:ring-0"
          style={{ 
            minHeight: '38px',
            fontFamily: block.type === 'code' ? 'monospace' : 'inherit',
            fontSize: getTextSize(block.type)
          }}
          placeholder={getPlaceholder(block.type)}
        />
        <div className="flex items-center space-x-2 mt-2">
          <button 
            onClick={handleSave}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            Save
          </button>
          <button 
            onClick={handleCancel}
            className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  const renderDisplayView = () => {
    const displayContent = content || getPlaceholder(block.type);
    const isEmpty = !content.trim();

    const blockClasses = `
      group relative cursor-pointer transition-all duration-200 rounded px-2 py-1
      ${isEmpty ? 'text-gray-500 italic' : 'text-white hover:bg-gray-800'}
    `.trim();

    const element = (() => {
      switch (block.type) {
        case 'heading1':
          return <h1 className={`text-3xl font-bold ${blockClasses}`} style={{ fontSize: '2rem', lineHeight: '2.5rem' }}>{displayContent}</h1>;
        case 'heading2':
          return <h2 className={`text-2xl font-bold ${blockClasses}`} style={{ fontSize: '1.5rem', lineHeight: '2rem' }}>{displayContent}</h2>;
        case 'heading3':
          return <h3 className={`text-xl font-bold ${blockClasses}`} style={{ fontSize: '1.25rem', lineHeight: '1.75rem' }}>{displayContent}</h3>;
        case 'bullet':
          return (
            <div className={`flex items-start space-x-2 ${blockClasses}`}>
              <span className="text-gray-400 mt-1">•</span>
              <span className="flex-1">{displayContent}</span>
            </div>
          );
        case 'numbered':
          return (
            <div className={`flex items-start space-x-2 ${blockClasses}`}>
              <span className="text-gray-400 mt-1">1.</span>
              <span className="flex-1">{displayContent}</span>
            </div>
          );
        case 'quote':
          return (
            <blockquote className={`border-l-4 border-blue-500 pl-4 italic ${blockClasses}`}>
              {displayContent}
            </blockquote>
          );
        case 'code':
          return (
            <pre className={`bg-gray-800 px-4 py-3 rounded font-mono text-sm overflow-x-auto ${blockClasses}`}>
              <code className="text-green-400">{displayContent}</code>
            </pre>
          );
        case 'divider':
          return <hr className="border-gray-600 my-6" />;
        default:
          return <p className={blockClasses}>{displayContent}</p>;
      }
    })();

    return (
      <div
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        className="relative group"
      >
        <div onClick={startEditing} className="flex items-start space-x-2">
          <div className={`flex-shrink-0 pt-2 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'}`}>
            <GripVertical className="w-4 h-4 text-gray-500 cursor-move" />
          </div>
          <div className="flex-1">
            {element}
          </div>
        </div>
        
        {/* Action buttons */}
        {showActions && (
          <div className="absolute right-0 top-0 flex items-center space-x-1 bg-gray-800 rounded shadow-lg p-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                startEditing();
              }}
              className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
              title="Edit"
            >
              <Edit3 className="w-3 h-3" />
            </button>
            {onDuplicate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(block.id);
                }}
                className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                title="Duplicate"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 7h8v8H7V7zM5 5v12h12V5H5zM3 3h16v16H3V3z" />
                </svg>
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this block?')) {
                  onDelete(block.id);
                }
              }}
              className="p-1 hover:bg-red-600 rounded text-gray-400 hover:text-white transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="my-2">
      {isEditing ? renderEditingView() : renderDisplayView()}
    </div>
  );
};

const getPlaceholder = (type: BlockType): string => {
  switch (type) {
    case 'heading1':
      return 'Heading 1';
    case 'heading2':
      return 'Heading 2';
    case 'heading3':
      return 'Heading 3';
    case 'bullet':
      return 'Bullet point';
    case 'numbered':
      return 'Numbered item';
    case 'quote':
      return 'Quote text';
    case 'code':
      return 'Code snippet';
    default:
      return 'Type something...';
  }
};

const getTextSize = (type: BlockType): string => {
  switch (type) {
    case 'heading1':
      return '2rem';
    case 'heading2':
      return '1.5rem';
    case 'heading3':
      return '1.25rem';
    case 'code':
      return '0.875rem';
    default:
      return '1rem';
  }
};