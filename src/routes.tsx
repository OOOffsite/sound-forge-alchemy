import React from 'react';
import { createBrowserRouter, RouteObject } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import TrackStudio from './components/TrackStudio/TrackStudio';
import TrackLibrary from './components/TrackLibrary/TrackLibrary';
import Dashboard from './components/Dashboard/Dashboard';
import SearchPage from './components/SearchPage/SearchPage';
import ErrorPage from './components/ErrorPage/ErrorPage';

const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'search',
        element: <SearchPage />,
      },
      {
        path: 'library',
        element: <TrackLibrary />,
      },
      {
        path: 'tracks/:trackId',
        element: <TrackStudio />,
      }
    ],
  },
];

const router = createBrowserRouter(routes);

export default router;