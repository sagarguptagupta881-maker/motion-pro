'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, ChevronDown, ChevronRight, Plus, 
  MoreHorizontal, Edit3, Trash2, X, Check, FileText,
  Folder, FolderOpen, File, FilePlus
} from 'lucide-react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { Section, Subsection, PageItem } from '@/types';

export const Sidebar: React.FC = () => {
  const { state, dispatch } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingSubsection, setEditingSubsection] = useState<string | null>(null);
  const [editingPage, setEditingPage] = useState<string | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSubsectionTitle, setNewSubsectionTitle] = useState('');
  const [showNewSectionForm, setShowNewSectionForm] = useState(false);
  const [showNewSubsectionForm, setShowNewSubsectionForm] = useState<string | null>(null);
  const [expandedSubsections, setExpandedSubsections] = useState<string[]>([]);
  const [expandedPages, setExpandedPages] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{ 
    type: 'section' | 'subsection' | 'page'; 
    id: string; 
    sectionId?: string;
    subsectionId?: string;
    parentPageId?: string;
    x: number; 
    y: number;
  } | null>(null);

  // Resizable functionality
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const minWidth = 240;
  const maxWidth = 600;

  // Handle resize functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const newWidth = Math.min(Math.max(e.clientX, minWidth), maxWidth);
    setSidebarWidth(newWidth);
  }, [isResizing, minWidth, maxWidth]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  // Helper functions for nested pages
  const getAllPages = (): PageItem[] => {
    if (!state.workspace) return [];
    
    const pages: PageItem[] = [];
    state.workspace.sections.forEach(section => {
      pages.push(...section.pages);
      section.subsections?.forEach(subsection => {
        pages.push(...subsection.pages);
      });
    });
    return pages;
  };

  const getChildPages = (parentId: string): PageItem[] => {
    return getAllPages().filter(page => page.parentId === parentId);
  };

  const getRootPages = (pages: PageItem[]): PageItem[] => {
    return pages.filter(page => !page.parentId);
  };

  const hasChildPages = (pageId: string): boolean => {
    return getChildPages(pageId).length > 0;
  };

  const getPageDepth = (page: PageItem): number => {
    let depth = 0;
    let current = page;
    const allPages = getAllPages();
    
    while (current.parentId) {
      const parent = allPages.find(p => p.id === current.parentId);
      if (!parent) break;
      current = parent;
      depth++;
    }
    return depth;
  };

  const toggleSection = (sectionId: string) => {
    dispatch({ type: 'TOGGLE_SECTION', payload: sectionId });
  };

  const toggleSubsection = (subsectionId: string) => {
    setExpandedSubsections(prev => 
      prev.includes(subsectionId) 
        ? prev.filter(id => id !== subsectionId)
        : [...prev, subsectionId]
    );
  };

  const togglePage = (pageId: string) => {
    setExpandedPages(prev => 
      prev.includes(pageId) 
        ? prev.filter(id => id !== pageId)
        : [...prev, pageId]
    );
  };

  const openPage = (page: PageItem) => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: page });
    dispatch({ type: 'SET_FULL_SCREEN', payload: false });
  };

  const createNewPage = (sectionId: string, subsectionId?: string, parentPageId?: string) => {
    const newPage: PageItem = {
      id: `page-${Date.now()}`,
      title: 'Untitled',
      icon: '📄',
      type: 'page',
      content: [],
      parentId: parentPageId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    dispatch({ 
      type: 'ADD_PAGE', 
      payload: { sectionId, subsectionId, page: newPage } 
    });
    
    // Auto-expand the parent page if creating a child
    if (parentPageId && !expandedPages.includes(parentPageId)) {
      setExpandedPages(prev => [...prev, parentPageId]);
    }
    
    // Auto-expand the subsection if adding to one
    if (subsectionId && !expandedSubsections.includes(subsectionId)) {
      setExpandedSubsections(prev => [...prev, subsectionId]);
    }
    
    openPage(newPage);
  };

  const createNewSection = () => {
    if (!newSectionTitle.trim()) return;
    
    const newSection: Section = {
      id: `section-${Date.now()}`,
      title: newSectionTitle,
      icon: '📁',
      pages: [],
      subsections: [
        { id: `sub-mgmt-${Date.now()}`, title: 'Management', pages: [], order: 1 },
        { id: `sub-exec-${Date.now()}`, title: 'Execution', pages: [], order: 2 },
        { id: `sub-inbox-${Date.now()}`, title: 'Inbox', pages: [], order: 3 }
      ],
      order: (state.workspace?.sections.length || 0) + 1
    };

    dispatch({ type: 'ADD_SECTION', payload: newSection });
    setNewSectionTitle('');
    setShowNewSectionForm(false);
    dispatch({ type: 'TOGGLE_SECTION', payload: newSection.id });
  };

  const createNewSubsection = (sectionId: string) => {
    if (!newSubsectionTitle.trim()) return;
    
    const section = state.workspace?.sections.find(s => s.id === sectionId);
    const newSubsection: Subsection = {
      id: `subsection-${Date.now()}`,
      title: newSubsectionTitle,
      pages: [],
      order: (section?.subsections?.length || 0) + 1
    };

    dispatch({ 
      type: 'ADD_SUBSECTION', 
      payload: { sectionId, subsection: newSubsection } 
    });
    setNewSubsectionTitle('');
    setShowNewSubsectionForm(null);
    
    // Auto-expand the new subsection
    setExpandedSubsections(prev => [...prev, newSubsection.id]);
  };

  const updateSection = (sectionId: string, newTitle: string) => {
    const section = state.workspace?.sections.find(s => s.id === sectionId);
    if (section) {
      const updatedSection = { ...section, title: newTitle };
      dispatch({ type: 'UPDATE_SECTION', payload: updatedSection });
    }
    setEditingSection(null);
  };

  const updateSubsection = (sectionId: string, subsectionId: string, newTitle: string) => {
    const section = state.workspace?.sections.find(s => s.id === sectionId);
    const subsection = section?.subsections?.find(sub => sub.id === subsectionId);
    
    if (subsection) {
      const updatedSubsection = { ...subsection, title: newTitle };
      dispatch({ 
        type: 'UPDATE_SUBSECTION', 
        payload: { sectionId, subsection: updatedSubsection } 
      });
    }
    setEditingSubsection(null);
  };

  const updatePageTitle = (pageId: string, newTitle: string) => {
    const allPages = getAllPages();
    const page = allPages.find(p => p.id === pageId);
    if (page) {
      const updatedPage = { ...page, title: newTitle, updatedAt: new Date() };
      dispatch({ type: 'UPDATE_PAGE', payload: updatedPage });
    }
    setEditingPage(null);
  };

  const deleteSection = (sectionId: string) => {
    if (confirm('Delete this section and all its content?')) {
      dispatch({ type: 'DELETE_SECTION', payload: sectionId });
    }
    setContextMenu(null);
  };

  const deleteSubsection = (sectionId: string, subsectionId: string) => {
    if (confirm('Delete this subsection and all its pages?')) {
      dispatch({ 
        type: 'DELETE_SUBSECTION', 
        payload: { sectionId, subsectionId } 
      });
      // Remove from expanded list
      setExpandedSubsections(prev => prev.filter(id => id !== subsectionId));
    }
    setContextMenu(null);
  };

  const deletePage = (pageId: string) => {
    const childPages = getChildPages(pageId);
    const confirmMessage = childPages.length > 0 
      ? `Delete this page and its ${childPages.length} child page(s)?`
      : 'Delete this page?';
      
    if (confirm(confirmMessage)) {
      // Delete the page and all its children
      dispatch({ type: 'DELETE_PAGE', payload: { pageId } });
      
      // Remove from expanded lists
      setExpandedPages(prev => prev.filter(id => id !== pageId));
    }
    setContextMenu(null);
  };

  const handleRightClick = (e: React.MouseEvent, type: 'section' | 'subsection' | 'page', id: string, sectionId?: string, subsectionId?: string, parentPageId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      type,
      id,
      sectionId,
      subsectionId,
      parentPageId,
      x: e.clientX,
      y: e.clientY
    });
  };

  const ContextMenu = () => {
    if (!contextMenu) return null;

    return (
      <div 
        className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 min-w-[160px]"
        style={{ 
          left: contextMenu.x, 
          top: contextMenu.y 
        }}
      >
        {contextMenu.type === 'section' && (
          <>
            <button
              onClick={() => {
                setEditingSection(contextMenu.id);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
            >
              <Edit3 className="w-4 h-4" />
              <span>Rename</span>
            </button>
            <button
              onClick={() => deleteSection(contextMenu.id)}
              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </>
        )}
        
        {contextMenu.type === 'subsection' && (
          <>
            <button
              onClick={() => {
                if (contextMenu.sectionId) {
                  createNewPage(contextMenu.sectionId, contextMenu.id);
                }
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Page</span>
            </button>
            <button
              onClick={() => {
                setEditingSubsection(contextMenu.id);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
            >
              <Edit3 className="w-4 h-4" />
              <span>Rename</span>
            </button>
            <button
              onClick={() => {
                if (contextMenu.sectionId) {
                  deleteSubsection(contextMenu.sectionId, contextMenu.id);
                }
              }}
              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </>
        )}

        {contextMenu.type === 'page' && (
          <>
            <button
              onClick={() => {
                if (contextMenu.sectionId) {
                  createNewPage(contextMenu.sectionId, contextMenu.subsectionId, contextMenu.id);
                }
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
            >
              <FilePlus className="w-4 h-4" />
              <span>Add Child Page</span>
            </button>
            <button
              onClick={() => {
                setEditingPage(contextMenu.id);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
            >
              <Edit3 className="w-4 h-4" />
              <span>Rename</span>
            </button>
            <button
              onClick={() => deletePage(contextMenu.id)}
              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Page</span>
            </button>
          </>
        )}
      </div>
    );
  };

  // Recursive component to render nested pages
  const PageTreeItem: React.FC<{ 
    page: PageItem; 
    sectionId: string; 
    subsectionId?: string; 
    depth?: number;
  }> = ({ page, sectionId, subsectionId, depth = 0 }) => {
    const childPages = getChildPages(page.id);
    const isExpanded = expandedPages.includes(page.id);
    const hasChildren = childPages.length > 0;
    
    const indentStyle = { marginLeft: `${depth * 16}px` };

    return (
      <div>
        <div className="group relative" style={indentStyle}>
          {editingPage === page.id ? (
            <div className="flex items-center space-x-2 py-1">
              <input
                type="text"
                defaultValue={page.title}
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updatePageTitle(page.id, (e.target as HTMLInputElement).value);
                  }
                  if (e.key === 'Escape') setEditingPage(null);
                }}
                onBlur={(e) => updatePageTitle(page.id, e.target.value)}
              />
            </div>
          ) : (
            <div
              onClick={() => hasChildren ? togglePage(page.id) : openPage(page)}
              onDoubleClick={() => openPage(page)}
              onContextMenu={(e) => handleRightClick(e, 'page', page.id, sectionId, subsectionId, page.parentId)}
              className={`w-full flex items-center space-x-2 px-2 py-2 rounded-lg text-sm transition-colors group ${
                state.currentPage?.id === page.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center space-x-1 min-w-0 flex-1">
                {hasChildren && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePage(page.id);
                    }}
                    className="p-0.5 hover:bg-gray-700 rounded"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </button>
                )}
                {!hasChildren && <div className="w-4" />}
                <span className="text-sm flex-shrink-0">{page.icon}</span>
                <span className="truncate flex-1 text-left">{page.title}</span>
                {hasChildren && (
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    ({childPages.length})
                  </span>
                )}
              </div>
              
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    createNewPage(sectionId, subsectionId, page.id);
                  }}
                  className="p-1 hover:bg-gray-700 rounded transition-all"
                  title="Add child page"
                >
                  <Plus className="w-3 h-3 text-gray-400 hover:text-gray-200" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRightClick(e, 'page', page.id, sectionId, subsectionId, page.parentId);
                  }}
                  className="p-1 hover:bg-gray-700 rounded transition-all"
                  title="More options"
                >
                  <MoreHorizontal className="w-3 h-3 text-gray-400 hover:text-gray-200" />
                </button>
              </div>
              
              {page.status && (
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  page.status === 'Management' ? 'bg-gray-500' :
                  page.status === 'Execution' ? 'bg-blue-500' : 'bg-orange-500'
                }`}></span>
              )}
            </div>
          )}
        </div>
        
        {/* Render child pages recursively */}
        {hasChildren && isExpanded && (
          <div className="ml-4">
            {childPages.map(childPage => (
              <PageTreeItem
                key={childPage.id}
                page={childPage}
                sectionId={sectionId}
                subsectionId={subsectionId}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const getPageCount = (subsection: Subsection) => {
    const rootPages = getRootPages(subsection.pages);
    return subsection.pages.length;
  };

  const getRootPagesCount = (pages: PageItem[]) => {
    return getRootPages(pages).length;
  };

  return (
    <>
      <div 
        ref={sidebarRef}
        className="bg-gray-900 border-r border-gray-700 flex flex-col h-full relative"
        style={{ width: sidebarWidth }}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">MP</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-white truncate">{state.workspace?.name}</h2>
              <p className="text-xs text-gray-400 truncate">
                {state.workspace?.members.length || 0} members
              </p>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {/* Add New Section Button */}
            {showNewSectionForm ? (
              <div className="mb-4 bg-gray-800 border border-gray-600 rounded-lg p-3 space-y-3">
                <input
                  type="text"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="Section name..."
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createNewSection();
                    if (e.key === 'Escape') {
                      setShowNewSectionForm(false);
                      setNewSectionTitle('');
                    }
                  }}
                />
                <div className="flex space-x-2">
                  <button
                    onClick={createNewSection}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center space-x-1"
                    disabled={!newSectionTitle.trim()}
                  >
                    <Check className="w-4 h-4" />
                    <span>Create Section</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowNewSectionForm(false);
                      setNewSectionTitle('');
                    }}
                    className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 flex items-center space-x-1"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewSectionForm(true)}
                className="w-full mb-4 flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors border border-dashed border-gray-600"
              >
                <Plus className="w-4 h-4" />
                <span>Add Section</span>
              </button>
            )}

            {/* Sections */}
            <div className="space-y-2">
              {state.workspace?.sections.map(section => (
                <div key={section.id} className="space-y-1">
                  <div className="group">
                    {editingSection === section.id ? (
                      <div className="flex items-center space-x-2 py-2">
                        <input
                          type="text"
                          defaultValue={section.title}
                          className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateSection(section.id, (e.target as HTMLInputElement).value);
                            }
                            if (e.key === 'Escape') setEditingSection(null);
                          }}
                          onBlur={(e) => updateSection(section.id, e.target.value)}
                        />
                      </div>
                    ) : (
                      <div
                        onClick={() => toggleSection(section.id)}
                        onContextMenu={(e) => handleRightClick(e, 'section', section.id)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          {state.expandedSections.includes(section.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <span className="text-base">{section.icon}</span>
                          <span className="font-medium">{section.title}</span>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowNewSubsectionForm(section.id);
                            }}
                            className="p-1 hover:bg-gray-700 rounded"
                            title="Add subsection"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRightClick(e, 'section', section.id);
                            }}
                            className="p-1 hover:bg-gray-700 rounded"
                            title="More options"
                          >
                            <MoreHorizontal className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {state.expandedSections.includes(section.id) && (
                    <div className="ml-6 space-y-1">
                      {/* Direct section pages */}
                      {getRootPages(section.pages).map(page => (
                        <PageTreeItem
                          key={page.id}
                          page={page}
                          sectionId={section.id}
                        />
                      ))}

                      {/* New Subsection Form */}
                      {showNewSubsectionForm === section.id && (
                        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 space-y-2">
                          <input
                            type="text"
                            value={newSubsectionTitle}
                            onChange={(e) => setNewSubsectionTitle(e.target.value)}
                            placeholder="Subsection name..."
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') createNewSubsection(section.id);
                              if (e.key === 'Escape') {
                                setShowNewSubsectionForm(null);
                                setNewSubsectionTitle('');
                              }
                            }}
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={() => createNewSubsection(section.id)}
                              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center space-x-1"
                              disabled={!newSubsectionTitle.trim()}
                            >
                              <Check className="w-3 h-3" />
                              <span>Add</span>
                            </button>
                            <button
                              onClick={() => {
                                setShowNewSubsectionForm(null);
                                setNewSubsectionTitle('');
                              }}
                              className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 flex items-center space-x-1"
                            >
                              <X className="w-3 h-3" />
                              <span>Cancel</span>
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Subsections */}
                      {section.subsections?.map(subsection => (
                        <div key={subsection.id} className="space-y-1">
                          <div className="group relative">
                            {editingSubsection === subsection.id ? (
                              <div className="flex items-center space-x-2 py-1">
                                <input
                                  type="text"
                                  defaultValue={subsection.title}
                                  className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      updateSubsection(section.id, subsection.id, (e.target as HTMLInputElement).value);
                                    }
                                    if (e.key === 'Escape') setEditingSubsection(null);
                                  }}
                                  onBlur={(e) => updateSubsection(section.id, subsection.id, e.target.value)}
                                />
                              </div>
                            ) : (
                              <button
                                onClick={() => toggleSubsection(subsection.id)}
                                onContextMenu={(e) => handleRightClick(e, 'subsection', subsection.id, section.id)}
                                className="w-full flex items-center justify-between py-2 px-2 group hover:bg-gray-800 rounded-lg transition-colors"
                              >
                                <div className="flex items-center space-x-2 min-w-0">
                                  {expandedSubsections.includes(subsection.id) ? (
                                    <ChevronDown className="w-3 h-3 text-gray-500 flex-shrink-0" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3 text-gray-500 flex-shrink-0" />
                                  )}
                                  {expandedSubsections.includes(subsection.id) ? (
                                    <FolderOpen className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                  ) : (
                                    <Folder className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                  )}
                                  <span className="text-xs text-gray-300 font-medium truncate">
                                    {subsection.title}
                                  </span>
                                  <span className="text-xs text-gray-500 flex-shrink-0">
                                    ({getPageCount(subsection)})
                                  </span>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      createNewPage(section.id, subsection.id);
                                    }}
                                    className="p-1 hover:bg-gray-700 rounded transition-all"
                                    title="Add page"
                                  >
                                    <Plus className="w-3 h-3 text-gray-400 hover:text-gray-200" />
                                  </div>
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRightClick(e, 'subsection', subsection.id, section.id);
                                    }}
                                    className="p-1 hover:bg-gray-700 rounded transition-all"
                                    title="More options"
                                  >
                                    <MoreHorizontal className="w-3 h-3 text-gray-400 hover:text-gray-200" />
                                  </div>
                                </div>
                              </button>
                            )}
                          </div>
                          
                          {/* Subsection Pages */}
                          {expandedSubsections.includes(subsection.id) && (
                            <div className="ml-6 space-y-1">
                              {getRootPages(subsection.pages).length === 0 ? (
                                <div className="py-2 px-3 text-xs text-gray-500 italic bg-gray-800/50 rounded border-dashed border border-gray-700">
                                  No pages yet. Click + to add one.
                                </div>
                              ) : (
                                getRootPages(subsection.pages).map(page => (
                                  <PageTreeItem
                                    key={page.id}
                                    page={page}
                                    sectionId={section.id}
                                    subsectionId={subsection.id}
                                  />
                                ))
                              )}
                              
                              {/* Quick Add Page Button */}
                              <button
                                onClick={() => createNewPage(section.id, subsection.id)}
                                className="w-full flex items-center space-x-2 px-3 py-1 rounded text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors border border-dashed border-gray-700"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add page</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* Add page button for section level */}
                      <button
                        onClick={() => createNewPage(section.id)}
                        className="w-full flex items-center space-x-2 px-3 py-1 rounded text-sm text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors border border-dashed border-gray-700"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add page to section</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="p-4 border-t border-gray-700">
          <button className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
            Join or create workspace
          </button>
        </div>

        {/* Resize Handle */}
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors ${
            isResizing ? 'bg-blue-500' : 'bg-transparent'
          }`}
          onMouseDown={handleMouseDown}
        />
      </div>

      {/* Context Menu */}
      <ContextMenu />
    </>
  );
};