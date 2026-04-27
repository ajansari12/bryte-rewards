import { createBrowserRouter } from 'react-router';
import { Root } from '@/routes/Root';

export const router = createBrowserRouter([
  { path: '*', element: <Root /> },
]);
