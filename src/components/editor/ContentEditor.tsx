'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Edit3, Save, X, Trash2, GripVertical, Plus, Minus, Check, ChevronDown, 
  ChevronRight, Upload, Link, ExternalLink, MoreHorizontal, Trash, Copy, Paperclip
} from 'lucide-react';
import { ContentBlock, BlockType, PageItem } from '@/types';
import { useWorkspace } from '@/context/WorkspaceContext';

interface ContentEditorProps {
  block: ContentBlock;
  pageId: string;
  onUpdate: (blockId: string, content: string, metadata?: any) => void;
  onDelete: (blockId: string) => void;
  onDuplicate?: (blockId: string) => void;
  onReorder?: (draggedBlockId: string, targetBlockId: string, position: 'before' | 'after') => void;
  isDragOver?: boolean;
  dragPosition?: 'before' | 'after' | null;
}

// Define interfaces for better type safety
interface TableData {
  headers: string[];
  rows: string[][];
  columnTypes: string[];
  styling: {
    headerBg: string;
    alternatingRows: boolean;
    borders: boolean;
    compact: boolean;
  };
}

interface ListItem {
  id: string;
  content: string;
  level: number;
  children: ListItem[];
  isDropdown?: boolean;
  dropdownOptions?: string[];
  selectedOption?: string;
}

interface ChecklistItem {
  id: string;
  content: string;
  checked: boolean;
}

interface ImageData {
  url: string;
  caption: string;
  alt: string;
}

interface PageLink {
  pageId: string;
  pageTitle: string;
  sectionId: string;
  subsectionId?: string;
}

export const ContentEditor: React.FC<ContentEditorProps> = ({
  block,
  pageId,
  onUpdate,
  onDelete,
  onDuplicate,
  onReorder,
  isDragOver = false,
  dragPosition = null
}) => {
  const { state, dispatch } = useWorkspace();
  const [isEditing, setIsEditing] = useState(state.editingBlockId === block.id);
  const [content, setContent] = useState(block.content);
  const [metadata, setMetadata] = useState(block.metadata || {});
  const [showActions, setShowActions] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showPageLinkDialog, setShowPageLinkDialog] = useState<{show: boolean, rowIndex?: number, colIndex?: number}>({show: false});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get all available pages for linking
  const getAllPages = useCallback(() => {
    if (!state.workspace) return [];
    
    const pages: (PageItem & { sectionTitle: string, subsectionTitle?: string })[] = [];
    state.workspace.sections.forEach(section => {
      section.pages.forEach(page => {
        pages.push({
          ...page,
          sectionTitle: section.title,
        });
      });
      section.subsections?.forEach(subsection => {
        subsection.pages.forEach(page => {
          pages.push({
            ...page,
            sectionTitle: section.title,
            subsectionTitle: subsection.title,
          });
        });
      });
    });
    return pages.filter(page => page.id !== pageId); // Don't include current page
  }, [state.workspace, pageId]);

  useEffect(() => {
    setIsEditing(state.editingBlockId === block.id);
  }, [state.editingBlockId, block.id]);

  useEffect(() => {
    if (isEditing && textareaRef.current && ['text', 'heading1', 'heading2', 'heading3', 'quote', 'code'].includes(block.type)) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(content.length, content.length);
      autoResizeTextarea();
    }
  }, [isEditing, content]);

  // Use useCallback to prevent unnecessary re-renders
  const handleSave = useCallback(() => {
    onUpdate(block.id, content.trim(), metadata);
    setIsEditing(false);
    dispatch({ type: 'SET_EDITING_BLOCK', payload: null });
  }, [content, metadata, block.id, onUpdate, dispatch]);

  const handleCancel = useCallback(() => {
    setContent(block.content);
    setMetadata(block.metadata || {});
    setIsEditing(false);
    dispatch({ type: 'SET_EDITING_BLOCK', payload: null });
  }, [block.content, block.metadata, dispatch]);

  const startEditing = useCallback(() => {
    setIsEditing(true);
    dispatch({ type: 'SET_EDITING_BLOCK', payload: block.id });
  }, [block.id, dispatch]);

  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
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
    autoResizeTextarea();
  };

  // Initialize default data for advanced blocks
  const initializeBlockData = useCallback(() => {
    switch (block.type) {
      case 'table':
      case 'advanced_table':
        if (!metadata.tableData) {
          setMetadata(prev => ({
            ...prev,
            tableData: {
              headers: ['Column 1', 'Column 2'],
              rows: [['', ''], ['', '']],
              columnTypes: ['text', 'text'],
              styling: {
                headerBg: '#374151',
                alternatingRows: true,
                borders: true,
                compact: false
              }
            }
          }));
        }
        break;
      case 'nested_list':
        if (!metadata.listItems) {
          setMetadata(prev => ({
            ...prev,
            listItems: [
              { id: `item-${Date.now()}`, content: '', level: 0, children: [] }
            ],
            listType: 'bullet'
          }));
        }
        break;
      case 'checklist':
        if (!metadata.checklistItems) {
          setMetadata(prev => ({
            ...prev,
            checklistItems: [
              { id: `check-${Date.now()}`, content: '', checked: false }
            ]
          }));
        }
        break;
      case 'image':
        if (!metadata.imageData) {
          setMetadata(prev => ({
            ...prev,
            imageData: { url: '', caption: '', alt: '' }
          }));
        }
        break;
    }
  }, [block.type, metadata]);

  // Initialize data when editing starts
  useEffect(() => {
    if (isEditing) {
      initializeBlockData();
    }
  }, [isEditing, initializeBlockData]);

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', block.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const draggedBlockId = e.dataTransfer.getData('text/plain');
    
    if (draggedBlockId !== block.id && onReorder) {
      const rect = blockRef.current?.getBoundingClientRect();
      if (rect) {
        const dropY = e.clientY;
        const blockMiddle = rect.top + rect.height / 2;
        const position = dropY < blockMiddle ? 'before' : 'after';
        onReorder(draggedBlockId, block.id, position);
      }
    }
  };

  // Page linking functions (moved outside TableEditor to be accessible by PageLinkDialog)
  const handleCellPageLink = useCallback((rowIndex: number, colIndex: number, pageLink: PageLink) => {
    const tableData: TableData = metadata.tableData || {
      headers: ['Column 1', 'Column 2'],
      rows: [['', ''], ['', '']],
      columnTypes: ['text', 'text'],
      styling: { headerBg: '#374151', alternatingRows: true, borders: true, compact: false }
    };

    // Update cell with page link
    const newTableData = {
      ...tableData,
      rows: tableData.rows.map((row: string[], rIdx: number) => 
        rIdx === rowIndex 
          ? row.map((cell: string, cIdx: number) => cIdx === colIndex ? `🔗 ${pageLink.pageTitle}` : cell)
          : row
      )
    };

    // Store page link in metadata
    const linkKey = `pageLink_${rowIndex}_${colIndex}`;
    setMetadata(prev => ({
      ...prev,
      tableData: newTableData,
      pageLinks: {
        ...prev.pageLinks,
        [linkKey]: pageLink
      }
    }));
  }, [metadata.tableData]);

  const handleCellClick = useCallback((rowIndex: number, colIndex: number, cellValue: string) => {
    // Check if cell contains a page link
    const linkKey = `pageLink_${rowIndex}_${colIndex}`;
    const pageLink = metadata.pageLinks?.[linkKey];
    
    if (pageLink && cellValue.startsWith('🔗')) {
      // Navigate to the linked page
      const allPages = getAllPages();
      const linkedPage = allPages.find(p => p.id === pageLink.pageId);
      if (linkedPage) {
        dispatch({ type: 'SET_CURRENT_PAGE', payload: linkedPage });
      }
    }
  }, [metadata.pageLinks, getAllPages, dispatch]);

  // Table Component with stable inputs and page linking
  const TableEditor = () => {
    const tableData: TableData = metadata.tableData || {
      headers: ['Column 1', 'Column 2'],
      rows: [['', ''], ['', '']],
      columnTypes: ['text', 'text'],
      styling: { headerBg: '#374151', alternatingRows: true, borders: true, compact: false }
    };

    const updateTableData = (newTableData: TableData) => {
      setMetadata(prev => ({ ...prev, tableData: newTableData }));
    };

    const addRow = () => {
      const newTableData = {
        ...tableData,
        rows: [...tableData.rows, new Array(tableData.headers.length).fill('')]
      };
      updateTableData(newTableData);
    };

    const addColumn = () => {
      const newTableData = {
        ...tableData,
        headers: [...tableData.headers, `Column ${tableData.headers.length + 1}`],
        rows: tableData.rows.map((row: string[]) => [...row, '']),
        columnTypes: [...tableData.columnTypes, 'text']
      };
      updateTableData(newTableData);
    };

    const updateCell = (rowIndex: number, colIndex: number, value: string) => {
      const newTableData = {
        ...tableData,
        rows: tableData.rows.map((row: string[], rIdx: number) => 
          rIdx === rowIndex 
            ? row.map((cell: string, cIdx: number) => cIdx === colIndex ? value : cell)
            : row
        )
      };
      updateTableData(newTableData);
    };

    const updateHeader = (colIndex: number, value: string) => {
      const newTableData = {
        ...tableData,
        headers: tableData.headers.map((header: string, hIdx: number) => 
          hIdx === colIndex ? value : header
        )
      };
      updateTableData(newTableData);
    };

    const deleteRow = (rowIndex: number) => {
      if (tableData.rows.length > 1) {
        const newTableData = {
          ...tableData,
          rows: tableData.rows.filter((_, idx: number) => idx !== rowIndex)
        };
        updateTableData(newTableData);
      }
    };

    const deleteColumn = (colIndex: number) => {
      if (tableData.headers.length > 1) {
        const newTableData = {
          ...tableData,
          headers: tableData.headers.filter((_, idx: number) => idx !== colIndex),
          rows: tableData.rows.map((row: string[]) => row.filter((_, idx: number) => idx !== colIndex)),
          columnTypes: tableData.columnTypes.filter((_, idx: number) => idx !== colIndex)
        };
        updateTableData(newTableData);
      }
    };

    // File upload for table cells
    const handleCellFileUpload = (rowIndex: number, colIndex: number, file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileData = {
          name: file.name,
          type: file.type,
          size: file.size,
          data: event.target?.result as string
        };
        updateCell(rowIndex, colIndex, `📎 ${file.name}`);
        
        // Store file data in metadata
        const fileKey = `file_${rowIndex}_${colIndex}`;
        setMetadata(prev => ({
          ...prev,
          files: {
            ...prev.files,
            [fileKey]: fileData
          }
        }));
      };
      reader.readAsDataURL(file);
    };

    if (isEditing) {
  return (
    <div className="border border-gray-600 rounded-lg overflow-hidden">
      {/* 👇 scroll wrapper */}
      <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
        <table className="w-full min-w-max">{/* 👈 min-w-max ensures table doesn't shrink */}
          <thead>
            <tr style={{ backgroundColor: tableData.styling.headerBg }}>
              {tableData.headers.map((header: string, colIndex: number) => (
                <th key={`header-${colIndex}`} className="relative group">
                  <input
                    type="text"
                    defaultValue={header}
                    className="w-full p-2 bg-transparent text-white font-semibold border-none outline-none"
                    placeholder="Column header"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        updateHeader(colIndex, (e.target as HTMLInputElement).value);
                        e.currentTarget.blur();
                      }
                    }}
                  />
                  <button
                    onClick={() => deleteColumn(colIndex)}
                    className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
                    title="Delete column"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </th>
              ))}
              <th className="p-2">
                <button onClick={addColumn} className="text-gray-400 hover:text-white">
                  <Plus className="w-4 h-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {tableData.rows.map((row: string[], rowIndex: number) => (
              <tr
                key={`row-${rowIndex}`}
                className={rowIndex % 2 === 1 && tableData.styling.alternatingRows ? "bg-gray-800" : ""}
              >
                {row.map((cell: string, colIndex: number) => (
                  <td key={`cell-${rowIndex}-${colIndex}`} className="relative group">
                    <div className="flex items-center space-x-1">
                      <input
                        type="text"
                        defaultValue={cell}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            updateCell(rowIndex, colIndex, (e.target as HTMLInputElement).value);
                            e.currentTarget.blur();
                          }
                        }}
                        className="flex-1 p-2 bg-transparent text-gray-300 border-none outline-none focus:bg-gray-700"
                        placeholder="Enter data"
                      />

                      <button
                        onClick={() => setShowPageLinkDialog({ show: true, rowIndex, colIndex })}
                        className="opacity-0 group-hover:opacity-100 cursor-pointer p-1 text-gray-400 hover:text-white"
                        title="Link to page"
                      >
                        <Link className="w-3 h-3" />
                      </button>

                      <label className="opacity-0 group-hover:opacity-100 cursor-pointer p-1 text-gray-400 hover:text-white">
                        <Paperclip className="w-3 h-3" />
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleCellFileUpload(rowIndex, colIndex, file);
                          }}
                        />
                      </label>
                    </div>
                  </td>
                ))}
                <td className="p-2">
                  <button
                    onClick={() => deleteRow(rowIndex)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
                    title="Delete row"
                  >
                    <Trash className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-2 border-t border-gray-600 flex justify-between">
        <button
          onClick={addRow}
          className="flex items-center space-x-1 px-2 py-1 text-sm text-gray-400 hover:text-white"
        >
          <Plus className="w-3 h-3" />
          <span>Add row</span>
        </button>
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <span>
            {tableData.rows.length} rows × {tableData.headers.length} columns
          </span>
        </div>
      </div>
    </div>
  );
}


    // Display mode
    return (
      <div className="border border-gray-600 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: tableData.styling?.headerBg || '#374151' }}>
              {tableData.headers.map((header: string, idx: number) => (
                <th key={`display-header-${idx}`} className="p-2 text-left font-semibold text-white border-r border-gray-600 last:border-r-0">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.rows.map((row: string[], rowIdx: number) => (
              <tr key={`display-row-${rowIdx}`} className={rowIdx % 2 === 1 && tableData.styling?.alternatingRows ? 'bg-gray-800' : ''}>
                {row.map((cell: string, cellIdx: number) => (
                  <td 
                    key={`display-cell-${rowIdx}-${cellIdx}`} 
                    className="p-2 text-gray-300 border-r border-gray-600 last:border-r-0 border-b border-gray-700 cursor-pointer hover:bg-gray-700"
                    onClick={() => handleCellClick(rowIdx, cellIdx, cell)}
                  >
                    {cell.startsWith('🔗') ? (
                      <span className="text-blue-400 hover:text-blue-300 flex items-center space-x-1">
                        <Link className="w-3 h-3" />
                        <span>{cell}</span>
                      </span>
                    ) : (
                      cell || <span className="text-gray-500">Empty</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-2 bg-gray-800 text-xs text-gray-400 text-center">
          {tableData.rows.length} rows × {tableData.headers.length} columns
        </div>
      </div>
    );
  };

  // Nested List Component with dropdown functionality
  const NestedListEditor = () => {
    const listData: ListItem[] = metadata.listItems || [{ id: `item-${Date.now()}`, content: '', level: 0, children: [] }];
    const listType: 'bullet' | 'numbered' = metadata.listType || 'bullet';

    const updateListData = (newListItems: ListItem[]) => {
      setMetadata(prev => ({ ...prev, listItems: newListItems }));
    };

    const addItem = (afterItemId?: string, level: number = 0) => {
      const newItem: ListItem = { 
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, 
        content: '', 
        level, 
        children: [] 
      };
      
      let newListItems: ListItem[];
      if (afterItemId) {
        const insertIndex = listData.findIndex((item: ListItem) => item.id === afterItemId) + 1;
        newListItems = [...listData.slice(0, insertIndex), newItem, ...listData.slice(insertIndex)];
      } else {
        newListItems = [...listData, newItem];
      }
      updateListData(newListItems);
    };

    const updateItem = (itemId: string, content: string) => {
      const newListItems = listData.map((item: ListItem) => 
        item.id === itemId ? { ...item, content } : item
      );
      updateListData(newListItems);
    };

    const deleteItem = (itemId: string) => {
      if (listData.length > 1) {
        const newListItems = listData.filter((item: ListItem) => item.id !== itemId);
        updateListData(newListItems);
      }
    };

    const indentItem = (itemId: string) => {
      const newListItems = listData.map((item: ListItem) => 
        item.id === itemId ? { ...item, level: Math.min(item.level + 1, 3) } : item
      );
      updateListData(newListItems);
    };

    const unindentItem = (itemId: string) => {
      const newListItems = listData.map((item: ListItem) => 
        item.id === itemId ? { ...item, level: Math.max(item.level - 1, 0) } : item
      );
      updateListData(newListItems);
    };

    // Dropdown functionality
    const toggleDropdown = (itemId: string) => {
      const newListItems = listData.map((item: ListItem) => 
        item.id === itemId ? { 
          ...item, 
          isDropdown: !item.isDropdown, 
          dropdownOptions: item.dropdownOptions || ['Option 1', 'Option 2', 'Option 3'] 
        } : item
      );
      updateListData(newListItems);
    };

    const updateDropdownOption = (itemId: string, optionIndex: number, value: string) => {
      const newListItems = listData.map((item: ListItem) => {
        if (item.id === itemId && item.dropdownOptions) {
          const newOptions = [...item.dropdownOptions];
          newOptions[optionIndex] = value;
          return { ...item, dropdownOptions: newOptions };
        }
        return item;
      });
      updateListData(newListItems);
    };

    const selectDropdownOption = (itemId: string, option: string) => {
      const newListItems = listData.map((item: ListItem) => 
        item.id === itemId ? { ...item, selectedOption: option } : item
      );
      updateListData(newListItems);
    };

    const addDropdownOption = (itemId: string) => {
      const newListItems = listData.map((item: ListItem) => {
        if (item.id === itemId && item.dropdownOptions) {
          return { 
            ...item, 
            dropdownOptions: [...item.dropdownOptions, `Option ${item.dropdownOptions.length + 1}`] 
          };
        }
        return item;
      });
      updateListData(newListItems);
    };

    const removeDropdownOption = (itemId: string, optionIndex: number) => {
      const newListItems = listData.map((item: ListItem) => {
        if (item.id === itemId && item.dropdownOptions && item.dropdownOptions.length > 1) {
          const newOptions = item.dropdownOptions.filter((_, idx) => idx !== optionIndex);
          return { ...item, dropdownOptions: newOptions };
        }
        return item;
      });
      updateListData(newListItems);
    };

    // File upload for list items
    const handleListFileUpload = (itemId: string, file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileData = {
          name: file.name,
          type: file.type,
          size: file.size,
          data: event.target?.result as string
        };
        updateItem(itemId, `📎 ${file.name}`);
        
        // Store file data in metadata
        const fileKey = `file_list_${itemId}`;
        setMetadata(prev => ({
          ...prev,
          files: {
            ...prev.files,
            [fileKey]: fileData
          }
        }));
      };
      reader.readAsDataURL(file);
    };

    if (isEditing) {
      return (
        <div className="space-y-2">
          {listData.map((item: ListItem, index: number) => (
            <div key={item.id} className="flex items-start space-x-2 group" style={{ paddingLeft: `${item.level * 20}px` }}>
              <div className="flex-shrink-0 pt-2">
                {listType === 'bullet' ? 
                  <span className="text-gray-400">•</span> : 
                  <span className="text-gray-400">{index + 1}.</span>
                }
              </div>
              <div className="flex-1 flex items-center space-x-1">
                {item.isDropdown ? (
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2">
                      <select
                        value={item.selectedOption || ''}
                        onChange={(e) => selectDropdownOption(item.id, e.target.value)}
                        className="flex-1 bg-gray-700 text-gray-300 border border-gray-600 rounded px-2 py-1 focus:border-blue-500 outline-none"
                      >
                        <option value="">Select option...</option>
                        {item.dropdownOptions?.map((option, optIdx) => (
                          <option key={optIdx} value={option}>{option}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => toggleDropdown(item.id)}
                        className="p-1 text-gray-400 hover:text-white"
                        title="Convert to text"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    {item.dropdownOptions?.map((option, optIdx) => (
                      <div key={optIdx} className="flex items-center space-x-1">
                        <input
  type="text"
  defaultValue={option} // 👈 keeps typing local until save
  className="flex-1 bg-gray-800 text-gray-300 border border-gray-600 rounded px-2 py-1 text-sm"
  placeholder={`Option ${optIdx + 1}`}
  onBlur={(e) => updateDropdownOption(item.id, optIdx, e.target.value)} // 👈 save on blur
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      updateDropdownOption(item.id, optIdx, (e.target as HTMLInputElement).value); // 👈 save on Enter
      e.currentTarget.blur(); // optional: exit focus after save
    }
  }}
/>

                        <button
                          onClick={() => removeDropdownOption(item.id, optIdx)}
                          className="p-1 text-red-400 hover:text-red-300"
                          title="Remove option"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addDropdownOption(item.id)}
                      className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-400 hover:text-white"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add option</span>
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    defaultValue={item.content}
                    className="flex-1 bg-transparent text-gray-300 border-none outline-none focus:bg-gray-800 rounded px-1"
                    placeholder="List item"
                    onBlur={(e) => updateItem(item.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        updateItem(item.id, (e.target as HTMLInputElement).value);
                        addItem(item.id, item.level);
                      } else if (e.key === "Tab") {
                        e.preventDefault();
                        if (e.shiftKey) {
                          unindentItem(item.id);
                        } else {
                          indentItem(item.id);
                        }
                      }
                    }}
                  />
                )}

                <label className="opacity-0 group-hover:opacity-100 cursor-pointer p-1 text-gray-400 hover:text-white">
                  <Paperclip className="w-3 h-3" />
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleListFileUpload(item.id, file);
                    }}
                  />
                </label>
              </div>
              <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1">
                <button
                  onClick={() => toggleDropdown(item.id)}
                  className="p-1 text-gray-400 hover:text-white"
                  title={item.isDropdown ? "Convert to text" : "Convert to dropdown"}
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
                <button
                  onClick={() => addItem(item.id, item.level)}
                  className="p-1 text-gray-400 hover:text-white"
                  title="Add item below"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="p-1 text-red-400 hover:text-red-300"
                  title="Delete item"
                >
                  <Trash className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => addItem()}
            className="flex items-center space-x-1 px-2 py-1 text-sm text-gray-400 hover:text-white"
          >
            <Plus className="w-3 h-3" />
            <span>Add item</span>
          </button>
        </div>
      );
    }

    // Display mode
    return (
      <div className="space-y-1">
        {listData.map((item: ListItem, index: number) => (
          <div key={item.id} className="flex items-start space-x-2" style={{ paddingLeft: `${item.level * 20}px` }}>
            <span className="text-gray-400 mt-1">
              {listType === 'bullet' ? '•' : `${index + 1}.`}
            </span>
            <span className="text-gray-300 flex-1">
              {item.isDropdown ? (
                <span className="flex items-center space-x-2">
                  <ChevronDown className="w-3 h-3" />
                  <span>{item.selectedOption || 'No option selected'}</span>
                </span>
              ) : (
                item.content || <span className="text-gray-500 italic">Empty item</span>
              )}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Checklist Component with stable inputs
  const ChecklistEditor = () => {
    const checklistItems: ChecklistItem[] = metadata.checklistItems || [{ id: `check-${Date.now()}`, content: '', checked: false }];

    const updateChecklistData = (newItems: ChecklistItem[]) => {
      setMetadata(prev => ({ ...prev, checklistItems: newItems }));
    };

    const addItem = (afterItemId?: string) => {
      const newItem: ChecklistItem = { 
        id: `check-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, 
        content: '', 
        checked: false 
      };
      
      let newItems: ChecklistItem[];
      if (afterItemId) {
        const insertIndex = checklistItems.findIndex((item: ChecklistItem) => item.id === afterItemId) + 1;
        newItems = [...checklistItems.slice(0, insertIndex), newItem, ...checklistItems.slice(insertIndex)];
      } else {
        newItems = [...checklistItems, newItem];
      }
      updateChecklistData(newItems);
    };

    const updateItem = (itemId: string, content: string) => {
      const newItems = checklistItems.map((item: ChecklistItem) => 
        item.id === itemId ? { ...item, content } : item
      );
      updateChecklistData(newItems);
    };

    const toggleItem = (itemId: string) => {
      const newItems = checklistItems.map((item: ChecklistItem) => 
        item.id === itemId ? { ...item, checked: !item.checked } : item
      );
      updateChecklistData(newItems);
    };

    const deleteItem = (itemId: string) => {
      if (checklistItems.length > 1) {
        const newItems = checklistItems.filter((item: ChecklistItem) => item.id !== itemId);
        updateChecklistData(newItems);
      }
    };

    if (isEditing) {
      return (
        <div className="space-y-2">
          {checklistItems.map((item: ChecklistItem) => (
            <div key={item.id} className="flex items-start space-x-3 group">
              <button
                onClick={() => toggleItem(item.id)}
                className={`flex-shrink-0 mt-1 w-4 h-4 border-2 rounded flex items-center justify-center ${
                  item.checked ? 'bg-blue-500 border-blue-500' : 'border-gray-400 hover:border-gray-300'
                }`}
              >
                {item.checked && <Check className="w-2 h-2 text-white" />}
              </button>
              <div className="flex-1 flex items-center space-x-1">
                <input
                  type="text"
                  value={item.content}
                  onChange={(e) => updateItem(item.id, e.target.value)}
                  className={`flex-1 bg-transparent border-none outline-none focus:bg-gray-800 rounded px-1 ${
                    item.checked ? 'line-through text-gray-500' : 'text-gray-300'
                  }`}
                  placeholder="Task description"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addItem(item.id);
                    }
                  }}
                />
              </div>
              <button
                onClick={() => deleteItem(item.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300"
                title="Delete task"
              >
                <Trash className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            onClick={() => addItem()}
            className="flex items-center space-x-1 px-2 py-1 text-sm text-gray-400 hover:text-white"
          >
            <Plus className="w-3 h-3" />
            <span>Add task</span>
          </button>
        </div>
      );
    }

    // Display mode
    const completedCount = checklistItems.filter((item: ChecklistItem) => item.checked).length;
    const totalCount = checklistItems.length;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-2 mb-3">
          <div className="text-xs text-gray-400">
            {completedCount}/{totalCount} completed
          </div>
          <div className="flex-1 bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>
        {checklistItems.map((item: ChecklistItem) => (
          <div key={item.id} className="flex items-start space-x-3 cursor-pointer" onClick={() => toggleItem(item.id)}>
            <div className={`flex-shrink-0 mt-1 w-4 h-4 border-2 rounded flex items-center justify-center ${
              item.checked ? 'bg-blue-500 border-blue-500' : 'border-gray-400'
            }`}>
              {item.checked && <Check className="w-2 h-2 text-white" />}
            </div>
            <span className={`text-gray-300 ${item.checked ? 'line-through text-gray-500' : ''}`}>
              {item.content || <span className="text-gray-500 italic">Empty task</span>}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Image Component with file support
  const ImageEditor = () => {
    const imageData: ImageData = metadata.imageData || { url: '', caption: '', alt: '' };
    
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const newImageData = { 
            ...imageData, 
            url: event.target?.result as string, 
            alt: file.name 
          };
          setMetadata(prev => ({ ...prev, imageData: newImageData }));
        };
        reader.readAsDataURL(file);
      }
    };

    const updateImageData = (field: keyof ImageData, value: string) => {
      const newImageData = { ...imageData, [field]: value };
      setMetadata(prev => ({ ...prev, imageData: newImageData }));
    };

    if (isEditing) {
      return (
        <div className="space-y-4">
          <div className="flex space-x-2">
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Image</span>
            </button>
            
            <input
              type="url"
              value={imageData.url}
              onChange={(e) => updateImageData('url', e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 outline-none"
              placeholder="Or paste image URL"
            />
          </div>
          <input 
            ref={fileInputRef} 
            type="file" 
            accept="image/*" 
            onChange={handleImageUpload} 
            className="hidden" 
          />
          <input
            type="text"
            value={imageData.caption}
            onChange={(e) => updateImageData('caption', e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 outline-none"
            placeholder="Image caption (optional)"
          />
          {imageData.url && (
            <div className="border border-gray-600 rounded overflow-hidden">
              <img 
                src={imageData.url} 
                alt={imageData.alt || 'Uploaded image'} 
                className="w-full h-auto max-h-96 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
        </div>
      );
    }

    return imageData.url ? (
      <div className="space-y-2">
        <img 
          src={imageData.url} 
          alt={imageData.alt || 'Image'} 
          className="w-full h-auto rounded border border-gray-600"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        {imageData.caption && (
          <p className="text-sm text-gray-400 text-center italic">{imageData.caption}</p>
        )}
      </div>
    ) : (
      <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
        <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
        <p className="text-gray-500">Click to add an image</p>
      </div>
    );
  };

  // Page Link Dialog Component
  const PageLinkDialog = () => {
    if (!showPageLinkDialog.show) return null;
    
    const availablePages = getAllPages();

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold text-white mb-4">Link to Page</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {availablePages.map((page: any) => (
              <button
                key={page.id}
                onClick={() => {
                  if (showPageLinkDialog.rowIndex !== undefined && showPageLinkDialog.colIndex !== undefined) {
                    handleCellPageLink(
                      showPageLinkDialog.rowIndex,
                      showPageLinkDialog.colIndex,
                      {
                        pageId: page.id,
                        pageTitle: page.title,
                        sectionId: page.sectionId || '',
                        subsectionId: page.subsectionId
                      }
                    );
                  }
                  setShowPageLinkDialog({show: false});
                }}
                className="w-full text-left p-3 rounded hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{page.icon}</span>
                  <div className="flex-1">
                    <p className="text-white font-medium">{page.title}</p>
                    <p className="text-xs text-gray-400">
                      {page.sectionTitle} {page.subsectionTitle && `• ${page.subsectionTitle}`}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setShowPageLinkDialog({show: false})}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderEditingView = () => {
    const commonEditControls = (
      <div className="flex items-center space-x-2 mt-3">
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
    );

    switch (block.type) {
      case 'table':
      case 'advanced_table':
        return <div className="space-y-3"><TableEditor />{commonEditControls}</div>;
      case 'nested_list':
        return <div className="space-y-3"><NestedListEditor />{commonEditControls}</div>;
      case 'checklist':
        return <div className="space-y-3"><ChecklistEditor />{commonEditControls}</div>;
      case 'image':
        return <div className="space-y-3"><ImageEditor />{commonEditControls}</div>;
      default:
        return (
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
              {commonEditControls}
            </div>
          </div>
        );
    }
  };

  const renderDisplayView = () => {
    const displayContent = content || getPlaceholder(block.type);
    const isEmpty = !content.trim() && !Object.keys(metadata).length;
    const blockClasses = `group relative cursor-pointer transition-all duration-200 rounded px-2 py-1 ${
      isEmpty ? 'text-gray-500 italic' : 'text-white hover:bg-gray-800'
    } ${isDragging ? 'opacity-50 scale-95' : ''}`;

    const renderBlockContent = () => {
      switch (block.type) {
        case 'table':
        case 'advanced_table':
          return metadata.tableData ? <TableEditor /> : <p className={blockClasses}>Click to add a table</p>;
        case 'nested_list':
          return metadata.listItems ? <NestedListEditor /> : <p className={blockClasses}>Click to add a nested list</p>;
        case 'checklist':
          return metadata.checklistItems ? <ChecklistEditor /> : <p className={blockClasses}>Click to add a checklist</p>;
        case 'image':
          return <ImageEditor />;
        case 'heading1':
          return <h1 className={`text-3xl font-bold ${blockClasses}`}>{displayContent}</h1>;
        case 'heading2':
          return <h2 className={`text-2xl font-bold ${blockClasses}`}>{displayContent}</h2>;
        case 'heading3':
          return <h3 className={`text-xl font-bold ${blockClasses}`}>{displayContent}</h3>;
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
    };

    return (
      <div 
        ref={blockRef} 
        onMouseEnter={() => setShowActions(true)} 
        onMouseLeave={() => setShowActions(false)} 
        onDragOver={handleDragOver} 
        onDrop={handleDrop} 
        className={`relative group ${isDragOver ? 'bg-gray-800/50' : ''}`}
      >
        <div onClick={startEditing} className="flex items-start space-x-2">
          <div 
            className={`flex-shrink-0 pt-2 transition-opacity ${showActions || isDragging ? 'opacity-100' : 'opacity-0'}`} 
            draggable 
            onDragStart={handleDragStart} 
            onDragEnd={handleDragEnd}
          >
            <GripVertical className={`w-4 h-4 text-gray-500 cursor-move hover:text-gray-300 ${isDragging ? 'text-blue-500' : ''}`} />
          </div>
          <div className="flex-1">{renderBlockContent()}</div>
        </div>
        
        {isDragOver && dragPosition === 'before' && (
          <div className="absolute -top-1 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
        )}
        {isDragOver && dragPosition === 'after' && (
          <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
        )}
        
        {showActions && !isDragging && (
          <div className="absolute right-0 top-0 flex items-center space-x-1 bg-gray-800 rounded shadow-lg p-1">
            <button
              onClick={(e) => { e.stopPropagation(); startEditing(); }}
              className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
              title="Edit"
            >
              <Edit3 className="w-3 h-3" />
            </button>
            {onDuplicate && (
              <button
                onClick={(e) => { e.stopPropagation(); onDuplicate(block.id); }}
                className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                title="Duplicate"
              >
                <Copy className="w-3 h-3" />
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
      <PageLinkDialog />
    </div>
  );
};

const getPlaceholder = (type: BlockType): string => {
  switch (type) {
    case 'heading1': return 'Heading 1';
    case 'heading2': return 'Heading 2';
    case 'heading3': return 'Heading 3';
    case 'bullet': return 'Bullet point';
    case 'numbered': return 'Numbered item';
    case 'quote': return 'Quote text';
    case 'code': return 'Code snippet';
    case 'table': return 'Table';
    case 'advanced_table': return 'Advanced table';
    case 'nested_list': return 'Nested list';
    case 'checklist': return 'Task list';
    case 'image': return 'Image';
    default: return 'Type something...';
  }
};

const getTextSize = (type: BlockType): string => {
  switch (type) {
    case 'heading1': return '2rem';
    case 'heading2': return '1.5rem';  
    case 'heading3': return '1.25rem';
    case 'code': return '0.875rem';
    default: return '1rem';
  }
};