import React, { useState } from 'react';
import TrainingGroundManager from './TrainingGroundManager';
import TrainingShiftManager from './TrainingShiftManager';

const TrainingTabWrapper = () => {
  const [subTab, setSubTab] = useState<'ground' | 'shift'>('ground');

  return (
    <div>
      <div className="tabs mb-4" style={{ borderBottom: '1px solid var(--border)', marginLeft: '1rem', marginRight: '1rem' }}>
        <div 
          className={`tab ${subTab === 'ground' ? 'active' : ''}`}
          onClick={() => setSubTab('ground')}
          style={{ padding: '0.5rem 1rem' }}
        >
          Quản lý sân
        </div>
        <div 
          className={`tab ${subTab === 'shift' ? 'active' : ''}`}
          onClick={() => setSubTab('shift')}
          style={{ padding: '0.5rem 1rem' }}
        >
          Quản lý ca tập
        </div>
      </div>
      
      <div style={{ marginTop: '1rem' }}>
        {subTab === 'ground' && <TrainingGroundManager />}
        {subTab === 'shift' && <TrainingShiftManager />}
      </div>
    </div>
  );
};

export default TrainingTabWrapper;
