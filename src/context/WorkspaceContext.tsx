'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Workspace, PageItem, Section, Subsection, Comment } from '@/types';

interface WorkspaceState {
  workspace: Workspace | null;
  currentPage: PageItem | null;
  comments: Record<string, Comment[]>;
  isFullScreen: boolean;
  editingBlockId: string | null;
  expandedSections: string[];
}

type WorkspaceAction =
  | { type: 'SET_WORKSPACE'; payload: Workspace }
  | { type: 'SET_CURRENT_PAGE'; payload: PageItem | null }
  | { type: 'UPDATE_PAGE'; payload: PageItem }
  | { type: 'ADD_COMMENT'; payload: { pageId: string; comment: Comment } }
  | { type: 'SET_FULL_SCREEN'; payload: boolean }
  | { type: 'SET_EDITING_BLOCK'; payload: string | null }
  | { type: 'ADD_SECTION'; payload: Section }
  | { type: 'UPDATE_SECTION'; payload: Section }
  | { type: 'DELETE_SECTION'; payload: string }
  | { type: 'TOGGLE_SECTION'; payload: string }
  | { type: 'ADD_SUBSECTION'; payload: { sectionId: string; subsection: Subsection } }
  | { type: 'UPDATE_SUBSECTION'; payload: { sectionId: string; subsection: Subsection } }
  | { type: 'DELETE_SUBSECTION'; payload: { sectionId: string; subsectionId: string } }
  | { type: 'ADD_PAGE'; payload: { sectionId: string; subsectionId?: string; page: PageItem } }
  | { type: 'DELETE_PAGE'; payload: { pageId: string } };

const initialState: WorkspaceState = {
  workspace: null,
  currentPage: null,
  comments: {},
  isFullScreen: false,
  editingBlockId: null,
  expandedSections: ['overall', 'marketing', 'bd-sales'],
};

// Helper function to get all child pages recursively
const getAllChildPageIds = (parentId: string, allPages: PageItem[]): string[] => {
  const childIds: string[] = [];
  const directChildren = allPages.filter(page => page.parentId === parentId);
  
  directChildren.forEach(child => {
    childIds.push(child.id);
    childIds.push(...getAllChildPageIds(child.id, allPages));
  });
  
  return childIds;
};

// Helper function to get all pages from workspace
const getAllPages = (workspace: Workspace): PageItem[] => {
  const pages: PageItem[] = [];
  workspace.sections.forEach(section => {
    pages.push(...section.pages);
    section.subsections?.forEach(subsection => {
      pages.push(...subsection.pages);
    });
  });
  return pages;
};

const workspaceReducer = (state: WorkspaceState, action: WorkspaceAction): WorkspaceState => {
  switch (action.type) {
    case 'SET_WORKSPACE':
      return { ...state, workspace: action.payload };
    
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload };
    
    case 'UPDATE_PAGE':
      if (!state.workspace) return state;
      
      const updatePageInSection = (section: Section): Section => ({
        ...section,
        pages: section.pages.map(page => 
          page.id === action.payload.id ? action.payload : page
        ),
        subsections: section.subsections?.map(sub => ({
          ...sub,
          pages: sub.pages.map(page => 
            page.id === action.payload.id ? action.payload : page
          )
        }))
      });

      const updatedSections = state.workspace.sections.map(updatePageInSection);
      
      return {
        ...state,
        workspace: { ...state.workspace, sections: updatedSections },
        currentPage: state.currentPage?.id === action.payload.id ? action.payload : state.currentPage
      };
    
    case 'ADD_COMMENT':
      return {
        ...state,
        comments: {
          ...state.comments,
          [action.payload.pageId]: [
            ...(state.comments[action.payload.pageId] || []),
            action.payload.comment
          ]
        }
      };
    
    case 'SET_FULL_SCREEN':
      return { ...state, isFullScreen: action.payload };
    
    case 'SET_EDITING_BLOCK':
      return { ...state, editingBlockId: action.payload };
    
    case 'TOGGLE_SECTION':
      return {
        ...state,
        expandedSections: state.expandedSections.includes(action.payload)
          ? state.expandedSections.filter(id => id !== action.payload)
          : [...state.expandedSections, action.payload]
      };
    
    case 'ADD_SECTION':
      if (!state.workspace) return state;
      return {
        ...state,
        workspace: {
          ...state.workspace,
          sections: [...state.workspace.sections, action.payload]
        }
      };
    
    case 'UPDATE_SECTION':
      if (!state.workspace) return state;
      return {
        ...state,
        workspace: {
          ...state.workspace,
          sections: state.workspace.sections.map(section =>
            section.id === action.payload.id ? action.payload : section
          )
        }
      };
    
    case 'DELETE_SECTION':
      if (!state.workspace) return state;
      return {
        ...state,
        workspace: {
          ...state.workspace,
          sections: state.workspace.sections.filter(section => section.id !== action.payload)
        }
      };

    case 'ADD_SUBSECTION':
      if (!state.workspace) return state;
      return {
        ...state,
        workspace: {
          ...state.workspace,
          sections: state.workspace.sections.map(section => {
            if (section.id === action.payload.sectionId) {
              return {
                ...section,
                subsections: [...(section.subsections || []), action.payload.subsection]
              };
            }
            return section;
          })
        }
      };

    case 'UPDATE_SUBSECTION':
      if (!state.workspace) return state;
      return {
        ...state,
        workspace: {
          ...state.workspace,
          sections: state.workspace.sections.map(section => {
            if (section.id === action.payload.sectionId) {
              return {
                ...section,
                subsections: section.subsections?.map(sub =>
                  sub.id === action.payload.subsection.id ? action.payload.subsection : sub
                )
              };
            }
            return section;
          })
        }
      };

    case 'DELETE_SUBSECTION':
      if (!state.workspace) return state;
      return {
        ...state,
        workspace: {
          ...state.workspace,
          sections: state.workspace.sections.map(section => {
            if (section.id === action.payload.sectionId) {
              return {
                ...section,
                subsections: section.subsections?.filter(sub => sub.id !== action.payload.subsectionId)
              };
            }
            return section;
          })
        }
      };
    
    case 'ADD_PAGE':
      if (!state.workspace) return state;
      return {
        ...state,
        workspace: {
          ...state.workspace,
          sections: state.workspace.sections.map(section => {
            if (section.id === action.payload.sectionId) {
              if (action.payload.subsectionId) {
                // Add to subsection
                return {
                  ...section,
                  subsections: section.subsections?.map(sub =>
                    sub.id === action.payload.subsectionId
                      ? { ...sub, pages: [...sub.pages, action.payload.page] }
                      : sub
                  )
                };
              } else {
                // Add to section
                return { ...section, pages: [...section.pages, action.payload.page] };
              }
            }
            return section;
          })
        }
      };
    
    case 'DELETE_PAGE':
      if (!state.workspace) return state;
      
      // Get all pages to find child pages
      const allPages = getAllPages(state.workspace);
      const pageIdsToDelete = [action.payload.pageId, ...getAllChildPageIds(action.payload.pageId, allPages)];
      
      // Filter out all pages that should be deleted (parent and all children)
      const filterPages = (pages: PageItem[]): PageItem[] => 
        pages.filter(page => !pageIdsToDelete.includes(page.id));

      const updatedWorkspace = {
        ...state.workspace,
        sections: state.workspace.sections.map(section => ({
          ...section,
          pages: filterPages(section.pages),
          subsections: section.subsections?.map(sub => ({
            ...sub,
            pages: filterPages(sub.pages)
          }))
        }))
      };

      // Clear current page if it was deleted
      const newCurrentPage = pageIdsToDelete.includes(state.currentPage?.id || '') 
        ? null 
        : state.currentPage;

      return {
        ...state,
        workspace: updatedWorkspace,
        currentPage: newCurrentPage
      };
    
    default:
      return state;
  }
};

const WorkspaceContext = createContext<{
  state: WorkspaceState;
  dispatch: React.Dispatch<WorkspaceAction>;
} | null>(null);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(workspaceReducer, initialState);

  return (
    <WorkspaceContext.Provider value={{ state, dispatch }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
};