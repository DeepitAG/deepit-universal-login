
import React from 'react';
import {Nav, NavProps} from '../commons/Nav';

export const UHeader = ({activeTab, setActiveTab}: NavProps) => {

  return (
    <div className="udashboard-header">
      <Nav activeTab={activeTab} setActiveTab={setActiveTab}/>
    </div>
  );
};
