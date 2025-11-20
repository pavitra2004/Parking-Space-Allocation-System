

import './index.css';

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Standard React entrypoint — render the default export from ./App
createRoot(document.getElementById('root')).render(<App />);