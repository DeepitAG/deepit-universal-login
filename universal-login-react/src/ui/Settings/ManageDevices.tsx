import React from 'react';
import Phone from '../assets/icons/phone.svg';
import Accordion from './Accordion';

export const ManageDevices = () => (
  <Accordion
    title="Manage devices"
    subtitle="You currently have 3 authorized devices"
    icon={Phone}
  >
    <div>Content</div>
  </Accordion>
);

export default ManageDevices;
