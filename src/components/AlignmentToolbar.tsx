// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React from 'react';
import { 
  AlignHorizontalDistributeCenter, 
  AlignVerticalDistributeCenter,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal
} from 'lucide-react';
import { Node } from 'reactflow';
import './AlignmentToolbar.css';
import { useLanguage } from '../i18n/LanguageContext';

interface AlignmentToolbarProps {
  selectedNodes: Node[];
  onAlign: (type: string) => void;
}

const AlignmentToolbar: React.FC<AlignmentToolbarProps> = ({ selectedNodes, onAlign }) => {
  const { t } = useLanguage();
  if (selectedNodes.length < 2) return null;

  return (
    <div className="alignment-toolbar">
      <div className="toolbar-section">
        <span className="toolbar-label">{t("Align:")}</span>
        <button 
          onClick={() => onAlign('left')} 
          title={t("Align Left")}
          className="toolbar-btn"
        >
          <AlignStartHorizontal size={18} />
        </button>
        <button 
          onClick={() => onAlign('center-h')} 
          title={t("Align Center Horizontal")}
          className="toolbar-btn"
        >
          <AlignCenterHorizontal size={18} />
        </button>
        <button 
          onClick={() => onAlign('right')} 
          title={t("Align Right")}
          className="toolbar-btn"
        >
          <AlignEndHorizontal size={18} />
        </button>
      </div>

      <div className="toolbar-separator"></div>

      <div className="toolbar-section">
        <button 
          onClick={() => onAlign('top')} 
          title={t("Align Top")}
          className="toolbar-btn"
        >
          <AlignStartVertical size={18} />
        </button>
        <button 
          onClick={() => onAlign('center-v')} 
          title={t("Align Center Vertical")}
          className="toolbar-btn"
        >
          <AlignCenterVertical size={18} />
        </button>
        <button 
          onClick={() => onAlign('bottom')} 
          title={t("Align Bottom")}
          className="toolbar-btn"
        >
          <AlignEndVertical size={18} />
        </button>
      </div>

      <div className="toolbar-separator"></div>

      <div className="toolbar-section">
        <span className="toolbar-label">{t("Distribute:")}</span>
        <button 
          onClick={() => onAlign('distribute-h')} 
          title={t("Distribute Horizontally")}
          className="toolbar-btn"
        >
          <AlignHorizontalDistributeCenter size={18} />
        </button>
        <button 
          onClick={() => onAlign('distribute-v')} 
          title={t("Distribute Vertically")}
          className="toolbar-btn"
        >
          <AlignVerticalDistributeCenter size={18} />
        </button>
      </div>

      <div className="toolbar-info">
        {selectedNodes.length} {' '}{t("nodes selected")}{' '}</div>
    </div>
  );
};

export default AlignmentToolbar;
