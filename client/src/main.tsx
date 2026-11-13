import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { initAuthTokens } from './lib/api';
import './styles.css';
import './aurora.css';

void initAuthTokens();

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: (count, error) => (error instanceof Error && 'status' in error && error.status === 401 ? false : count < 1), refetchOnWindowFocus: false } } });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter><App /></BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
