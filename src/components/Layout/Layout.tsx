import React from 'react';
import { Outlet } from 'react-router-dom';

const Layout: React.FC = () => {
  return (
    <div>
      <header>
        <h1>Sound Forge Alchemy</h1>
      </header>
      <main>
        <Outlet />
      </main>
      <footer>
        <p>© 2025 Sound Forge Alchemy</p>
      </footer>
    </div>
  );
};

export default Layout;