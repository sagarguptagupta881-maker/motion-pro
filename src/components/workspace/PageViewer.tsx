'use client';

import React, { useState } from 'react';
import { 
  ArrowLeft, Maximize2, Minimize2, Share, Star, MoreHorizontal, Plus, 
  Calendar, Users, Tag,
  FileText
} from 'lucide-react';
import { PageItem, ContentBlock } from '@/types';
import { useWorkspace } from '@/context/WorkspaceContext';
import { ContentEditor } from '@/components/editor/ContentEditor';
import { BlockTypeSelector } from '@/components/editor/BlockTypeSelector';
import { CommentsPanel } from './CommentsPanel';

interface PageViewerProps {
  page: PageItem;
}

export const PageViewer: React.FC<PageViewerProps> = ({ page }) => {
  const { state, dispatch } = useWorkspace();
  const [showBlockSelector, setShowBlockSelector] = useState(false);
  const [blockSelectorPosition, setBlockSelectorPosition] = useState<{ x: number; y: number } | undefined>();

  const updatePage = (updatedPage: PageItem) => {
    dispatch({ type: 'UPDATE_PAGE', payload: updatedPage });
  };

  const updateBlockContent = (blockId: string, content: string) => {
    const updatedContent = page.content?.map(block => 
      block.id === blockId ? { ...block, content, updatedAt: new Date() } : block
    ) || [];
    
    updatePage({
      ...page,
      content: updatedContent,
      updatedAt: new Date()
    });
  };

  const addNewBlock = (type: string, afterBlockId?: string) => {
    const newBlock: ContentBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: type as ContentBlock['type'],
      content: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    let newContent;
    if (afterBlockId) {
      const currentContent = page.content || [];
      const insertIndex = currentContent.findIndex(block => block.id === afterBlockId) + 1;
      newContent = [
        ...currentContent.slice(0, insertIndex),
        newBlock,
        ...currentContent.slice(insertIndex)
      ];
    } else {
      newContent = [...(page.content || []), newBlock];
    }

    updatePage({
      ...page,
      content: newContent,
      updatedAt: new Date()
    });

    dispatch({ type: 'SET_EDITING_BLOCK', payload: newBlock.id });
  };

  const deleteBlock = (blockId: string) => {
    const updatedContent = page.content?.filter(block => block.id !== blockId) || [];
    updatePage({
      ...page,
      content: updatedContent,
      updatedAt: new Date()
    });
  };

  const duplicateBlock = (blockId: string) => {
    const blockToDuplicate = page.content?.find(block => block.id === blockId);
    if (blockToDuplicate) {
      const duplicatedBlock: ContentBlock = {
        ...blockToDuplicate,
        id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const currentContent = page.content || [];
      const insertIndex = currentContent.findIndex(block => block.id === blockId) + 1;
      const newContent = [
        ...currentContent.slice(0, insertIndex),
        duplicatedBlock,
        ...currentContent.slice(insertIndex)
      ];

      updatePage({
        ...page,
        content: newContent,
        updatedAt: new Date()
      });
    }
  };

  const handleAddBlockClick = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setBlockSelectorPosition({
      x: rect.left,
      y: rect.bottom + 5
    });
    setShowBlockSelector(true);
  };

  const updatePageTitle = (newTitle: string) => {
    updatePage({
      ...page,
      title: newTitle,
      updatedAt: new Date()
    });
  };

  const toggleFullScreen = () => {
    dispatch({ type: 'SET_FULL_SCREEN', payload: !state.isFullScreen });
  };

  return (
    <div className={`${state.isFullScreen ? 'fixed inset-0 z-50 bg-gray-900' : ''} flex flex-col h-full`}>
      {/* Page Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gray-900 flex-shrink-0">
        <div className="flex items-center space-x-4 flex-1">
          {state.isFullScreen && (
            <button 
              onClick={() => dispatch({ type: 'SET_CURRENT_PAGE', payload: null })}
              className="p-2 hover:bg-gray-800 rounded transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          
          <div className="flex items-center space-x-3 flex-1">
            <span className="text-2xl">{page.icon}</span>
            <input
              type="text"
              value={page.title}
              onChange={(e) => updatePageTitle(e.target.value)}
              className="text-2xl font-semibold text-white bg-transparent border-none focus:outline-none flex-1"
              placeholder="Untitled"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={toggleFullScreen}
            className="p-2 hover:bg-gray-800 rounded transition-colors"
            title={state.isFullScreen ? 'Exit full screen' : 'Full screen'}
          >
            {state.isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button className="p-2 hover:bg-gray-800 rounded transition-colors" title="Share">
            <Share className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-gray-800 rounded transition-colors" title="Add to favorites">
            <Star className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-gray-800 rounded transition-colors" title="More options">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-8">
            {/* Page Properties */}
            {(page.status || page.assignees || page.deadline) && (
              <div className="mb-8 p-4 bg-gray-850 rounded-lg border border-gray-700">
                <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center">
                  <Tag className="w-4 h-4 mr-2" />
                  Properties
                </h3>
                <div className="space-y-3">
                  {page.status && (
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-400 w-20 text-sm">Status</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        page.status === 'Management' ? 'bg-gray-600 text-gray-100' :
                        page.status === 'Execution' ? 'bg-blue-600 text-blue-100' : 
                        'bg-orange-600 text-orange-100'
                      }`}>
                        {page.status}
                      </span>
                    </div>
                  )}
                  
                  {page.assignees && (
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-400 w-20 text-sm">Assignees</span>
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        {page.assignees.map((assignee, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-medium">{assignee[0].toUpperCase()}</span>
                            </div>
                            <span className="text-gray-300 text-sm">{assignee}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-4">
                    <span className="text-gray-400 w-20 text-sm">Deadline</span>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500 text-sm">{page.deadline || 'Not set'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Content Blocks */}
            <div className="space-y-1">
              {page.content?.map((block, index) => (
                <ContentEditor 
                  key={block.id} 
                  block={block} 
                  pageId={page.id}
                  onUpdate={updateBlockContent}
                  onDelete={deleteBlock}
                  onDuplicate={duplicateBlock}
                />
              )) || (
                <div className="text-center py-12">
                  <div className="text-gray-500 mb-4">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>This page is empty</p>
                  </div>
                </div>
              )}
              
              {/* Add New Block */}
              <div className="group py-2">
                <button
                  onClick={handleAddBlockClick}
                  className="flex items-center space-x-2 px-2 py-3 text-gray-500 hover:text-gray-300 transition-colors w-full text-left"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Click to add a block, or type "/" for commands</span>
                </button>
                
                {showBlockSelector && (
                  <BlockTypeSelector 
                    onSelect={addNewBlock}
                    onClose={() => setShowBlockSelector(false)}
                    position={blockSelectorPosition}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Comments Panel */}
        <CommentsPanel pageId={page.id} />
      </div>
    </div>
  );
};